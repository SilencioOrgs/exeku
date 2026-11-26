import { isObject, text } from "@/lib/accounts/rules";
import type { FieldErrors } from "@/types/account";
import { isBannerId, type BannerId } from "@/lib/banners";
import type { CompetitionEvent, EventAccess } from "@/types/competition";
import type { OrgPermission, OrgRole } from "@/types/org";

/** Presidents can do everything. Officers and org advisers can publish events and review applications. */
export const can = (role: OrgRole | null, permission: OrgPermission, isAdviser = false) =>
  role === "president" || ((role === "officer" || isAdviser) && permission !== "manageOfficers");

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
const MIN_COMPETITION_MS = 5 * 60_000;
const MAX_COMPETITION_MS = 7 * 24 * 60 * 60_000;

function manilaDateOf(ms: number): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date(ms));
}

export interface CheckedTournamentConfig {
  startsAt: string;
  endsAt: string;
  teamSize: number;
  problemIds: string[];
}

export interface CheckedEvent {
  title: string;
  summary: string;
  startsOn: string;
  access: EventAccess;
  banner: BannerId;
  featured: boolean;
  tournament?: CheckedTournamentConfig;
}

type Checked<T> = ({ ok: true } & T) | { ok: false; fieldErrors: FieldErrors };

export function checkEvent(input: unknown, today: string, nowMs = Date.now()): Checked<CheckedEvent> {
  const source = isObject(input) ? input : {};
  const title = text(source, "title");
  const summary = text(source, "summary");
  const access = ACCESS.find((a) => a === source.access);
  const banner = isBannerId(source.banner) ? source.banner : undefined;
  const isCompetition = source.isCompetition === true;
  const errors: FieldErrors = {};

  if (title.length < 3 || title.length > 120) errors.title = "Enter a title of 3 to 120 characters.";
  if (summary.length < 3 || summary.length > 300) errors.summary = "Enter a summary of 3 to 300 characters.";
  if (!access) errors.access = "Choose who can compete.";
  if (!banner) errors.banner = "Choose a banner.";

  let startsOn = text(source, "startsOn");
  let tournament: CheckedTournamentConfig | undefined;

  if (isCompetition) {
    const startsAtRaw = text(source, "startsAt");
    const endsAtRaw = text(source, "endsAt");
    const startMs = Date.parse(startsAtRaw);
    const endMs = Date.parse(endsAtRaw);
    if (!startsAtRaw || Number.isNaN(startMs)) {
      errors.startsAt = "Choose when the competition starts.";
    } else if (startMs < nowMs - 60_000) {
      errors.startsAt = "Start time must be in the future.";
    }
    if (!endsAtRaw || Number.isNaN(endMs)) {
      errors.endsAt = "Choose when the competition ends.";
    } else if (!Number.isNaN(startMs)) {
      const duration = endMs - startMs;
      if (duration < MIN_COMPETITION_MS) errors.endsAt = "Competition must run for at least 5 minutes.";
      else if (duration > MAX_COMPETITION_MS) errors.endsAt = "Competition duration cannot exceed 7 days.";
    }

    const mode = source.mode === "solo" || source.mode === "team" ? source.mode : undefined;
    let teamSize = 1;
    if (mode === "solo") {
      teamSize = 1;
    } else if (mode === "team") {
      const parsedSize = typeof source.teamSize === "number" ? source.teamSize : Number(source.teamSize);
      if (!Number.isInteger(parsedSize) || parsedSize < 2 || parsedSize > 10) {
        errors.teamSize = "Choose a team size between 2 and 10.";
      } else {
        teamSize = parsedSize;
      }
    } else {
      errors.teamSize = "Choose solo or team mode.";
    }

    const rawProblems = Array.isArray(source.problemIds) ? source.problemIds : [];
    const problemIds = [...new Set(rawProblems.filter((id): id is string => typeof id === "string" && id.trim().length > 0).map((id) => id.trim()))];
    if (problemIds.length === 0) {
      errors.problemIds = "Select at least 1 problem for the competition.";
    } else if (problemIds.length > 10) {
      errors.problemIds = "Select up to 10 problems.";
    }

    if (!Number.isNaN(startMs)) {
      startsOn = manilaDateOf(startMs);
    }
    if (!errors.startsAt && !errors.endsAt && !errors.teamSize && !errors.problemIds) {
      tournament = {
        startsAt: new Date(startMs).toISOString(),
        endsAt: new Date(endMs).toISOString(),
        teamSize,
        problemIds,
      };
    }
  } else {
    // Date.parse quietly rolls 2026-02-31 over to March, so the date must survive a round trip.
    if (!ISO_DATE.test(startsOn) || Number.isNaN(Date.parse(startsOn)) || new Date(startsOn).toISOString().slice(0, 10) !== startsOn) {
      errors.startsOn = "Choose the event date.";
    } else if (startsOn < today) {
      errors.startsOn = "Choose today or a later date.";
    }
  }

  if (!access || !banner || Object.keys(errors).length > 0) return { ok: false, fieldErrors: errors };
  return { ok: true, title, summary, startsOn, access, banner, featured: source.featured === true, ...(tournament ? { tournament } : {}) };
}
