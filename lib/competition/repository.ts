import "server-only";
import { schoolDirectory } from "@/lib/accounts/school-directory";
import type { Viewer } from "@/lib/auth/viewer";
import type { BannerId } from "@/lib/banners";
import { todayInManila } from "@/lib/dates";
import { db, must } from "@/lib/db/client";
import { firstSolves, solvesBetween } from "@/lib/judge/solves";
import { getProblemById } from "@/lib/problems/catalog";
import { can, canViewEvent } from "@/lib/orgs/rules";
import type { Campus } from "@/types/account";
import type { CompetitionEvent, EventAccess, EventsFeed, LeaderboardEntry, LeaderboardScore, WinnerPlacement } from "@/types/competition";
import type { OrgRole } from "@/types/org";
import { rankScores } from "./rank";

export const EVENT_COLUMNS = "id,org_id,title,summary,starts_on,access,banner,featured,winners,problem_ids,starts_at,ends_at,team_size,campus_ids,org_ids,audience_label,orgs(name,campus_id,campus_name)";

export interface EventRow {
  id: string; org_id: string | null; title: string; summary: string; starts_on: string; access: EventAccess;
  banner: BannerId; featured: boolean; winners: WinnerPlacement[] | null; problem_ids: string[] | null;
  starts_at?: string | null; ends_at?: string | null; team_size?: number | null;
  campus_ids?: string[] | null; org_ids?: string[] | null; audience_label?: string | null;
  orgs: { name: string; campus_id: string; campus_name: string } | null;
}

const toEvent = (r: EventRow, createdTitles: Map<string, string>): CompetitionEvent => ({
  id: r.id, orgId: r.org_id ?? "", orgName: r.orgs?.name ?? "Exeku", campusId: r.orgs?.campus_id ?? "", campusName: r.orgs?.campus_name ?? "",
  title: r.title, summary: r.summary, startsOn: r.starts_on, access: r.access, banner: r.banner, featured: r.featured,
  winners: r.winners ?? undefined,
  audience: r.campus_ids?.length || r.org_ids?.length ? { campusIds: r.campus_ids ?? [], orgIds: r.org_ids ?? [] } : undefined,
  audienceLabel: r.audience_label ?? undefined,
  tournament: r.starts_at && r.ends_at ? { startsAt: r.starts_at, endsAt: r.ends_at } : undefined,
  problems: (r.problem_ids ?? []).flatMap((id) => {
    const title = getProblemById(id)?.title ?? createdTitles.get(id);
    return title ? [{ id, title }] : [];
  }),
});

/** Built-in titles are in code; only problems created in the admin page need a query. */
export async function toEvents(rows: EventRow[]): Promise<CompetitionEvent[]> {
  const created = [...new Set(rows.flatMap((r) => r.problem_ids ?? []))].filter((id) => !getProblemById(id));
  const titles = created.length ? must(await db().from("problems").select("id,title").in("id", created)) as { id: string; title: string }[] : [];
  const createdTitles = new Map(titles.map((t) => [t.id, t.title]));
  return rows.map((r) => toEvent(r, createdTitles));
}

export async function getCampuses(): Promise<Campus[]> {
  return (await schoolDirectory.findSchool("lspu"))?.campuses ?? [];
}

/** Ranks within the scope, so a campus board starts again at 1. */
export async function getLeaderboard(campusId?: string): Promise<LeaderboardEntry[]> {
  const query = db().from("leaderboard").select("user_id,name,campus_id,campus_name,solved,points");
  const rows = must(await (campusId ? query.eq("campus_id", campusId) : query)) as
    { user_id: string; name: string; campus_id: string; campus_name: string; solved: number; points: number }[];
  const scores: LeaderboardScore[] = rows.map((r) => ({ id: r.user_id, name: r.name, campusId: r.campus_id, campusName: r.campus_name, solved: r.solved, points: r.points }));
  return rankScores(scores);
}

type Membership = { org_id: string; role: OrgRole; orgs: { name: string; campus_id: string } };

async function membershipsOf(viewer: Viewer) {
  return must(await db().from("org_members").select("org_id,role,orgs(name,campus_id)").eq("user_id", viewer.id)) as unknown as Membership[];
}

/** Which campuses and orgs count for this viewer when deciding what events they can see. */
const scopeOf = (viewer: Viewer, memberships: Membership[]) => ({
  orgIds: memberships.map((m) => m.org_id),
  campusIds: [...(viewer.campusId ? [viewer.campusId] : []), ...memberships.map((m) => m.orgs.campus_id)],
});

export const viewerScope = async (viewer: Viewer) => scopeOf(viewer, await membershipsOf(viewer));

export async function getEventsFeed(viewer: Viewer): Promise<EventsFeed> {
  const memberships = await membershipsOf(viewer);
  const scope = scopeOf(viewer, memberships);
  // shortcut: visibility is filtered here after loading every event, upgrade to a SQL filter past a few thousand events.
  const rows = must(await db().from("events").select(EVENT_COLUMNS).order("starts_on", { ascending: false })) as unknown as EventRow[];
  const registered = new Set((must(await db().from("tournament_members").select("event_id").eq("user_id", viewer.id)) as { event_id: string }[]).map((m) => m.event_id));
  const events = await Promise.all((await toEvents(rows)).filter((e) => canViewEvent(e, scope)).map(async (event) => {
    if (!event.tournament) return event;
    // Tournament problems stay locked until it starts, and only for students who registered.
    if (!registered.has(event.id) || Date.now() < Date.parse(event.tournament.startsAt)) return { ...event, problems: [] };
    const solves = await solvesBetween([viewer.id], event.tournament.startsAt, event.tournament.endsAt);
    return { ...event, solvedProblemIds: solves.map((s) => s.problemId) };
  }));
  return {
    events,
    postableOrgs: memberships.filter((m) => can(m.role, "publish")).map((m) => ({ id: m.org_id, name: m.orgs.name })),
    solvedProblemIds: (await firstSolves(viewer.id)).map((s) => s.problemId),
    today: todayInManila(),
  };
}
