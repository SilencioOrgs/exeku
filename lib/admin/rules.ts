import { isObject, text } from "@/lib/accounts/rules";
import type { FieldErrors } from "@/types/account";
import type { EventAccess } from "@/types/competition";

const ACCESS: EventAccess[] = ["open", "campus-only", "org-only"];
const MIN_MINUTES = 5;
const MAX_MINUTES = 480;
/** A little slack so a start of "right now" isn't refused while the form is being sent. */
const PAST_GRACE_MS = 60 * 1000;

const manilaDate = (date: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(date);

export interface CompetitionOptions { problems: Set<string>; campuses: Set<string>; orgs: Set<string> }

const chosen = (value: unknown) => (Array.isArray(value) ? [...new Set(value.filter((id): id is string => typeof id === "string"))] : []);

/** Runs in the admin's browser for step-by-step errors, and again on the server before anything is saved. */
export function checkCompetition(input: unknown, options: CompetitionOptions, now = Date.now()):
  { ok: true; title: string; teamSize: number; everyone: boolean; campusIds: string[]; orgIds: string[]; problemIds: string[]; schedule: Schedule } | { ok: false; fieldErrors: FieldErrors } {
  const source = isObject(input) ? input : {};
  const errors: FieldErrors = {};
  const title = text(source, "title");
  if (title.length < 3 || title.length > 120) errors.title = "Enter a title of 3 to 120 characters.";
  const teamSize = Number(source.teamSize);
  if (!Number.isInteger(teamSize) || teamSize < 1 || teamSize > 10) errors.teamSize = "Team size must be 1 to 10.";
  const timing = checkSchedule(input, now);
  if (!timing.ok) errors.schedule = timing.error;

  const everyone = source.everyone === true;
  const campusIds = everyone ? [] : chosen(source.campusIds);
  const orgIds = everyone ? [] : chosen(source.orgIds);
  if (!everyone && campusIds.length + orgIds.length === 0) errors.audience = "Choose at least one campus or organization.";
  else if (campusIds.some((id) => !options.campuses.has(id)) || orgIds.some((id) => !options.orgs.has(id))) errors.audience = "One of those campuses or organizations no longer exists.";

  const problemIds = chosen(source.problemIds);
  if (problemIds.length < 1 || problemIds.length > 20) errors.problemIds = "Choose 1 to 20 problems.";
  else if (problemIds.some((id) => !options.problems.has(id))) errors.problemIds = "One of those problems no longer exists.";

  if (Object.keys(errors).length > 0 || !timing.ok) return { ok: false, fieldErrors: errors };
  return { ok: true, title, teamSize, everyone, campusIds, orgIds, problemIds, schedule: timing.schedule };
}

export type Schedule = { startsAt: string; endsAt: string; startsOn: string };

export function checkSchedule(input: unknown, now = Date.now()): { ok: true; schedule: Schedule } | { ok: false; error: string } {
  const source = isObject(input) ? input : {};
  const start = Date.parse(text(source, "startsAt"));
  if (Number.isNaN(start)) return { ok: false, error: "Choose a start time." };
  if (start < now - PAST_GRACE_MS) return { ok: false, error: "Choose a start time in the future." };
  const minutes = Number(source.minutes);
  if (!Number.isInteger(minutes) || minutes < MIN_MINUTES || minutes > MAX_MINUTES) return { ok: false, error: `Length must be ${MIN_MINUTES} to ${MAX_MINUTES} minutes.` };
  const startDate = new Date(start);
  return { ok: true, schedule: { startsAt: startDate.toISOString(), endsAt: new Date(start + minutes * 60000).toISOString(), startsOn: manilaDate(startDate) } };
}

export function checkSet(input: unknown, known: Set<string>): { ok: true; name: string; problemIds: string[] } | { ok: false; error: string } {
  const source = isObject(input) ? input : {};
  const name = text(source, "name");
  if (name.length < 2 || name.length > 60) return { ok: false, error: "Enter a set name of 2 to 60 characters." };
  const ids = Array.isArray(source.problemIds) ? [...new Set(source.problemIds.filter((id): id is string => typeof id === "string"))] : [];
  if (ids.length < 1 || ids.length > 20) return { ok: false, error: "Choose 1 to 20 problems." };
  if (ids.some((id) => !known.has(id))) return { ok: false, error: "One of those problems no longer exists." };
  return { ok: true, name, problemIds: ids };
}

export function checkEventDetails(input: unknown): { ok: true; title: string; access: EventAccess; teamSize: number } | { ok: false; error: string } {
  const source = isObject(input) ? input : {};
  const title = text(source, "title");
  if (title.length < 3 || title.length > 120) return { ok: false, error: "Enter a title of 3 to 120 characters." };
  const access = ACCESS.find((a) => a === source.access);
  if (!access) return { ok: false, error: "Choose who can join." };
  const teamSize = Number(source.teamSize);
  if (!Number.isInteger(teamSize) || teamSize < 1 || teamSize > 10) return { ok: false, error: "Team size must be 1 to 10." };
  return { ok: true, title, access, teamSize };
}
