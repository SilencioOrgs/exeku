import { isObject, text } from "@/lib/accounts/rules";
import type { FieldErrors } from "@/types/account";
import { isBannerId, type BannerId } from "@/lib/banners";
import type { CompetitionEvent, EventAccess } from "@/types/competition";
import type { OrgPermission, OrgRole } from "@/types/org";

/** Presidents can do everything. Officers can do everything except manage other officers. */
export const can = (role: OrgRole | null, permission: OrgPermission) =>
  role === "president" || (role === "officer" && permission !== "manageOfficers");

/** Open events are for everyone. Campus-only and org-only events are shown only to those students. */
export function canViewEvent(event: Pick<CompetitionEvent, "access" | "campusId" | "orgId" | "audience">, viewer: { campusIds: string[]; orgIds: string[] }) {
  if (viewer.orgIds.includes(event.orgId)) return true;
  if (event.audience) return event.audience.campusIds.some((id) => viewer.campusIds.includes(id)) || event.audience.orgIds.some((id) => viewer.orgIds.includes(id));
  if (event.access === "open") return true;
  return event.access === "campus-only" && viewer.campusIds.includes(event.campusId);
}

export function eventAccessLabel(event: Pick<CompetitionEvent, "access" | "campusName" | "orgName" | "audienceLabel">) {
  if (event.audienceLabel) return `For ${event.audienceLabel}`;
  if (event.access === "open") return "Open to everyone";
  return event.access === "campus-only" ? `Campus only: ${event.campusName}` : `Org only: ${event.orgName}`;
}

const ACCESS: EventAccess[] = ["open", "campus-only", "org-only"];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

type Checked<T> = ({ ok: true } & T) | { ok: false; fieldErrors: FieldErrors };

export function checkEvent(input: unknown, today: string): Checked<{ title: string; summary: string; startsOn: string; access: EventAccess; banner: BannerId; featured: boolean }> {
  const source = isObject(input) ? input : {};
  const title = text(source, "title");
  const summary = text(source, "summary");
  const startsOn = text(source, "startsOn");
  const access = ACCESS.find((a) => a === source.access);
  const banner = isBannerId(source.banner) ? source.banner : undefined;
  const errors: FieldErrors = {};
  if (title.length < 3 || title.length > 120) errors.title = "Enter a title of 3 to 120 characters.";
  if (summary.length < 3 || summary.length > 300) errors.summary = "Enter a summary of 3 to 300 characters.";
  // Date.parse quietly rolls 2026-02-31 over to March, so the date must survive a round trip.
  if (!ISO_DATE.test(startsOn) || Number.isNaN(Date.parse(startsOn)) || new Date(startsOn).toISOString().slice(0, 10) !== startsOn) errors.startsOn = "Choose the event date.";
  else if (startsOn < today) errors.startsOn = "Choose today or a later date.";
  if (!access) errors.access = "Choose who can compete.";
  if (!banner) errors.banner = "Choose a banner.";
  if (!access || !banner || Object.keys(errors).length > 0) return { ok: false, fieldErrors: errors };
  return { ok: true, title, summary, startsOn, access, banner, featured: source.featured === true };
}
