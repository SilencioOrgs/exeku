import "server-only";
import { isObject, text } from "@/lib/accounts/rules";
import { db, must } from "@/lib/db/client";
import { listProblemSummaries } from "@/lib/problems/store";
import type { EventsOverview } from "@/types/admin";
import type { AdminResult } from "./repository";
import { checkCompetition, checkEventDetails, checkSchedule, checkSet } from "./rules";

const UNIQUE_VIOLATION = "23505";
const DEFAULT_BANNER = "podium";
const failed = (status: number, error: string): AdminResult => ({ ok: false, status, error });

type SetRow = { id: string; name: string; problem_ids: string[] };
const MAX_NAMES_IN_LABEL = 3;

async function loadCampuses() {
  const schools = must(await db().from("schools").select("short_name,campuses").order("name")) as { short_name: string; campuses: { id: string; name: string }[] }[];
  return schools.flatMap((school) => school.campuses.map((campus) => ({ id: campus.id, name: `${school.short_name} ${campus.name}` })));
}

export async function getEventsOverview(): Promise<EventsOverview> {
  const summaries = await listProblemSummaries();
  const titles = new Map(summaries.map((p) => [p.id, p.title]));
  const sets = must(await db().from("problem_sets").select("id,name,problem_ids").order("name")) as SetRow[];
  const orgs = must(await db().from("orgs").select("id,name").order("name")) as { id: string; name: string }[];
  const events = must(await db().from("events").select("id,title,starts_at,ends_at,problem_ids,access,audience_label").not("starts_at", "is", null).order("starts_at", { ascending: false })) as { id: string; title: string; starts_at: string; ends_at: string; problem_ids: string[]; access: string; audience_label: string | null }[];
  return {
    problems: summaries.map((p) => ({ id: p.id, title: p.title, difficulty: p.difficulty, category: p.category, totalTests: p.totalTestsCount })),
    // A problem deleted later simply drops out of its sets.
    sets: sets.map((s) => ({ id: s.id, name: s.name, problems: s.problem_ids.flatMap((id) => (titles.has(id) ? [{ id, title: titles.get(id)! }] : [])) })),
    orgs,
    campuses: await loadCampuses(),
    events: events.map((e) => ({ id: e.id, title: e.title, startsAt: e.starts_at, endsAt: e.ends_at, problemCount: e.problem_ids.length, audience: e.audience_label ?? (e.access === "open" ? "Everyone" : "Host only"), status: Date.now() < Date.parse(e.starts_at) ? "upcoming" : Date.now() < Date.parse(e.ends_at) ? "live" : "ended" })),
  };
}

export async function createSet(input: unknown): Promise<AdminResult> {
  const known = new Set((await listProblemSummaries()).map((p) => p.id));
  const checked = checkSet(input, known);
  if (!checked.ok) return failed(422, checked.error);
  const { error } = await db().from("problem_sets").insert({ name: checked.name, problem_ids: checked.problemIds });
  if (error?.code === UNIQUE_VIOLATION) return failed(409, "A set with this name already exists.");
  if (error) throw new Error(`Database error: ${error.message}`);
  return { ok: true };
}

export async function deleteSet(input: unknown): Promise<AdminResult> {
  must(await db().from("problem_sets").delete().eq("id", isObject(input) ? text(input, "id") : ""));
  return { ok: true };
}

export async function createEvent(input: unknown): Promise<AdminResult> {
  const details = checkEventDetails(input);
  if (!details.ok) return failed(422, details.error);
  const timing = checkSchedule(input);
  if (!timing.ok) return failed(422, timing.error);
  const source = isObject(input) ? input : {};
  const set = must(await db().from("problem_sets").select("id,name,problem_ids").eq("id", text(source, "setId")).maybeSingle()) as SetRow | null;
  if (!set) return failed(404, "That problem set wasn't found.");
  if (set.problem_ids.length === 0) return failed(422, "That problem set is empty.");
  const org = must(await db().from("orgs").select("id").eq("id", text(source, "orgId")).maybeSingle());
  if (!org) return failed(422, "Choose a host organization.");
  const { startsAt, endsAt, startsOn } = timing.schedule;
  must(await db().from("events").insert({
    org_id: text(source, "orgId"), title: details.title, summary: `${set.problem_ids.length} ${set.problem_ids.length === 1 ? "problem" : "problems"}. Register a team of up to ${details.teamSize}.`,
    starts_on: startsOn, access: details.access, banner: DEFAULT_BANNER, featured: false, problem_ids: set.problem_ids,
    starts_at: startsAt, ends_at: endsAt, team_size: details.teamSize,
  }));
  return { ok: true };
}

/** A competition is a timed team event open to everyone or to the chosen campuses and organizations. */
export async function createCompetition(input: unknown): Promise<AdminResult> {
  const [summaries, campuses, orgs] = await Promise.all([
    listProblemSummaries(),
    loadCampuses(),
    db().from("orgs").select("id,name").then((result) => must(result) as { id: string; name: string }[]),
  ]);
  const checked = checkCompetition(input, { problems: new Set(summaries.map((p) => p.id)), campuses: new Set(campuses.map((c) => c.id)), orgs: new Set(orgs.map((o) => o.id)) });
  if (!checked.ok) return { ok: false, status: 422, error: Object.values(checked.fieldErrors)[0], fieldErrors: checked.fieldErrors };

  const { title, teamSize, everyone, campusIds, orgIds, problemIds, schedule } = checked;
  const names = [...campuses.filter((c) => campusIds.includes(c.id)), ...orgs.filter((o) => orgIds.includes(o.id))].map((item) => item.name);
  const extra = names.length - MAX_NAMES_IN_LABEL;
  must(await db().from("events").insert({
    // The first organization hosts it, so it also shows on that organization's page.
    org_id: orgIds[0] ?? null,
    title,
    summary: `${problemIds.length} ${problemIds.length === 1 ? "problem" : "problems"}. Register a team of up to ${teamSize}.`,
    starts_on: schedule.startsOn,
    access: everyone ? "open" : campusIds.length > 0 ? "campus-only" : "org-only",
    banner: DEFAULT_BANNER,
    featured: false,
    problem_ids: problemIds,
    starts_at: schedule.startsAt,
    ends_at: schedule.endsAt,
    team_size: teamSize,
    campus_ids: campusIds,
    org_ids: orgIds,
    audience_label: everyone ? null : names.slice(0, MAX_NAMES_IN_LABEL).join(", ") + (extra > 0 ? ` and ${extra} more` : ""),
  }));
  return { ok: true };
}

export async function rescheduleEvent(input: unknown): Promise<AdminResult> {
  const timing = checkSchedule(input);
  if (!timing.ok) return failed(422, timing.error);
  const { startsAt, endsAt, startsOn } = timing.schedule;
  must(await db().from("events").update({ starts_at: startsAt, ends_at: endsAt, starts_on: startsOn }).eq("id", isObject(input) ? text(input, "id") : ""));
  return { ok: true };
}

export async function deleteEvent(input: unknown): Promise<AdminResult> {
  must(await db().from("events").delete().eq("id", isObject(input) ? text(input, "id") : ""));
  return { ok: true };
}
