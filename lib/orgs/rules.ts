import { isObject, text } from "@/lib/accounts/rules";
import type { FieldErrors } from "@/types/account";
import type { BannerStyle, EventAccess } from "@/types/competition";
import type { OrgPermission, OrgRole } from "@/types/org";

/** Presidents can do everything. Officers can do everything except manage other officers. */
export const can = (role: OrgRole | null, permission: OrgPermission) =>
  role === "president" || (role === "officer" && permission !== "manageOfficers");

const ACCESS: EventAccess[] = ["open", "org-only"];
const BANNERS: BannerStyle[] = ["ember", "spotlight", "graphite"];

type Checked<T> = ({ ok: true } & T) | { ok: false; fieldErrors: FieldErrors };

export function checkEvent(input: unknown): Checked<{ title: string; summary: string; access: EventAccess; banner: BannerStyle; featured: boolean }> {
  const source = isObject(input) ? input : {};
  const title = text(source, "title");
  const summary = text(source, "summary");
  const access = ACCESS.find((a) => a === source.access);
  const banner = BANNERS.find((b) => b === source.banner);
  const errors: FieldErrors = {};
  if (title.length < 3 || title.length > 120) errors.title = "Enter a title of 3 to 120 characters.";
  if (summary.length < 3 || summary.length > 300) errors.summary = "Enter a summary of 3 to 300 characters.";
  if (!access) errors.access = "Choose who can compete.";
  if (!banner) errors.banner = "Choose a banner.";
  if (!access || !banner || Object.keys(errors).length > 0) return { ok: false, fieldErrors: errors };
  return { ok: true, title, summary, access, banner, featured: source.featured === true };
}

export function checkPost(input: unknown): Checked<{ title: string; paragraphs: string[]; excerpt: string }> {
  const source = isObject(input) ? input : {};
  const title = text(source, "title");
  const body = text(source, "body");
  const errors: FieldErrors = {};
  if (title.length < 3 || title.length > 120) errors.title = "Enter a title of 3 to 120 characters.";
  if (body.length < 10 || body.length > 5000) errors.body = "Write 10 to 5000 characters.";
  if (Object.keys(errors).length > 0) return { ok: false, fieldErrors: errors };
  return { ok: true, title, paragraphs: body.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean), excerpt: body.slice(0, 160) };
}

export const slugify = (title: string) =>
  title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "post";
