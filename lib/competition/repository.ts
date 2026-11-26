import "server-only";
import { schoolDirectory } from "@/lib/accounts/school-directory";
import type { Viewer } from "@/lib/auth/viewer";
import type { BannerId } from "@/lib/banners";
import { getOrLoadPublic, invalidatePublicCache } from "@/lib/cache/public-cache";
import { todayInManila } from "@/lib/dates";
import { db, fetchAllPages, must } from "@/lib/db/client";
import { firstSolves, solvesBetween } from "@/lib/judge/solves";
import { getProblemById } from "@/lib/problems/catalog";
import { can, canViewEvent } from "@/lib/orgs/rules";
import type { Campus } from "@/types/account";
import type { CompetitionEvent, EventAccess, EventsFeed, LeaderboardEntry, LeaderboardScore, WinnerPlacement } from "@/types/competition";
import type { OrgRole } from "@/types/org";
import { rankScores } from "./rank";

const LEADERBOARD_TTL_MS = 30_000;

export function invalidateLeaderboardCache(): void {
  invalidatePublicCache("leaderboard:");
}

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
  tournament: r.starts_at && r.ends_at ? { startsAt: r.starts_at, endsAt: r.ends_at, teamSize: r.team_size ?? 1 } : undefined,
  problems: (r.problem_ids ?? []).flatMap((id) => {
    const title = getProblemById(id)?.title ?? createdTitles.get(id);
    return title ? [{ id, title }] : [];
  }),
});

const IN_CHUNK_SIZE = 100;

/** Built-in titles are in code; only problems created in the admin page need a query. */
export async function toEvents(rows: EventRow[]): Promise<CompetitionEvent[]> {
  const created = [...new Set(rows.flatMap((r) => r.problem_ids ?? []))].filter((id) => !getProblemById(id));
  const titleBatches = created.length
    ? await Promise.all(
        Array.from({ length: Math.ceil(created.length / IN_CHUNK_SIZE) }, (_, idx) =>
          db()
            .from("problems")
            .select("id,title")
            .in("id", created.slice(idx * IN_CHUNK_SIZE, (idx + 1) * IN_CHUNK_SIZE))
            .then((r) => must(r) as { id: string; title: string }[]),
        ),
      )
    : [];
  const createdTitles = new Map(titleBatches.flat().map((t) => [t.id, t.title]));
  return rows.map((r) => toEvent(r, createdTitles));
}

/** Returns the subset of problem IDs that exist in the catalog or public problems table. */
export async function resolveValidProblemIds(ids: string[]): Promise<string[]> {
  const unique = [...new Set(ids.filter((id) => id && !id.startsWith("cls-")))];
  const valid = new Set<string>();
  const toCheck: string[] = [];
  for (const id of unique) {
    if (getProblemById(id)) valid.add(id);
    else toCheck.push(id);
  }
  const batches = toCheck.length
    ? await Promise.all(
        Array.from({ length: Math.ceil(toCheck.length / IN_CHUNK_SIZE) }, (_, idx) =>
          db()
            .from("problems")
            .select("id")
            .in("id", toCheck.slice(idx * IN_CHUNK_SIZE, (idx + 1) * IN_CHUNK_SIZE))
            .then((r) => must(r) as { id: string }[]),
        ),
      )
    : [];
  for (const row of batches.flat()) valid.add(row.id);
  return unique.filter((id) => valid.has(id));
}

export async function getCampuses(): Promise<Campus[]> {
  return schoolDirectory.listAllCampuses();
}

/** Ranks within the scope, so a campus board starts again at 1. */
export async function getLeaderboard(campusId?: string): Promise<LeaderboardEntry[]> {
  return getOrLoadPublic(`leaderboard:${campusId ?? "all"}`, LEADERBOARD_TTL_MS, async () => {
    type BoardRow = { user_id: string; name: string; campus_id: string; campus_name: string; solved: number; points: number };
    const rows = await fetchAllPages<BoardRow>((from, to) => {
      const base = db()
        .from("leaderboard")
        .select("user_id,name,campus_id,campus_name,solved,points")
        .order("points", { ascending: false })
        .order("solved", { ascending: false })
        .order("user_id", { ascending: true })
        .range(from, to);
      return campusId ? base.eq("campus_id", campusId) : base;
    });
    const scores: LeaderboardScore[] = rows.map((r) => ({ id: r.user_id, name: r.name, campusId: r.campus_id, campusName: r.campus_name, solved: r.solved, points: r.points }));
    return rankScores(scores);
  });
}

type Membership = { org_id: string; role: OrgRole; orgs: { name: string; campus_id: string } };
type AdvisedOrg = { id: string; name: string; campus_id: string };

async function membershipsOf(viewer: Viewer) {
  return must(await db().from("org_members").select("org_id,role,orgs(name,campus_id)").eq("user_id", viewer.id)) as unknown as Membership[];
}

async function advisedOrgsOf(viewer: Viewer): Promise<AdvisedOrg[]> {
  const res = await db().from("orgs").select("id,name,campus_id").eq("adviser_id", viewer.id);
  if (res.error && /adviser_id/i.test(res.error.message)) return [];
  return (must(res) as unknown as AdvisedOrg[]) ?? [];
}

/** Which campuses and orgs count for this viewer when deciding what events they can see. */
const scopeOf = (viewer: Viewer, memberships: Membership[], advised: AdvisedOrg[]) => ({
  orgIds: [...new Set([...memberships.map((m) => m.org_id), ...advised.map((o) => o.id)])],
  campusIds: [...new Set([...(viewer.campusId ? [viewer.campusId] : []), ...memberships.map((m) => m.orgs.campus_id), ...advised.map((o) => o.campus_id)])],
});

export const viewerScope = async (viewer: Viewer) => {
  const [memberships, advised] = await Promise.all([membershipsOf(viewer), advisedOrgsOf(viewer)]);
  return scopeOf(viewer, memberships, advised);
};

/** Lightweight visibility check on raw EventRow so invisible events never trigger extra title lookups. */
function isEventRowVisible(r: EventRow, scope: { orgIds: string[]; campusIds: string[] }): boolean {
  return canViewEvent(
    {
      access: r.access,
      orgId: r.org_id ?? "",
      campusId: r.orgs?.campus_id ?? "",
      audience: r.campus_ids?.length || r.org_ids?.length ? { campusIds: r.campus_ids ?? [], orgIds: r.org_ids ?? [] } : undefined,
    },
    scope,
  );
}

/** Hides problem lists on tournaments until start time and only exposes them to registered viewers. */
export async function maskTournamentProblems(
  events: CompetitionEvent[],
  viewerId: string,
  includeSolves = false,
): Promise<CompetitionEvent[]> {
  const hasTournament = events.some((event) => Boolean(event.tournament));
  if (!hasTournament) return events;
  const myTeams = must(
    await db().from("tournament_members").select("event_id,team_id").eq("user_id", viewerId),
  ) as { event_id: string; team_id: string }[];
  const teamByEvent = new Map(myTeams.map((m) => [m.event_id, m.team_id]));

  const now = Date.now();
  const activeTournaments = events.filter(
    (event) => event.tournament && teamByEvent.has(event.id) && now >= Date.parse(event.tournament.startsAt),
  );

  let solves: Awaited<ReturnType<typeof solvesBetween>> = [];
  const membersByEvent = new Map<string, Set<string>>();
  if (includeSolves && activeTournaments.length > 0) {
    const teamIds = [...new Set(activeTournaments.map((e) => teamByEvent.get(e.id)).filter((id): id is string => Boolean(id)))];
    const teammateBatches = await Promise.all(
      Array.from({ length: Math.ceil(teamIds.length / IN_CHUNK_SIZE) }, (_, idx) =>
        db()
          .from("tournament_members")
          .select("event_id,team_id,user_id")
          .in("team_id", teamIds.slice(idx * IN_CHUNK_SIZE, (idx + 1) * IN_CHUNK_SIZE))
          .then((r) => must(r) as { event_id: string; team_id: string; user_id: string }[]),
      ),
    );
    const allUserIds = new Set<string>([viewerId]);
    for (const tm of teammateBatches.flat()) {
      allUserIds.add(tm.user_id);
      const set = membersByEvent.get(tm.event_id) ?? new Set<string>();
      set.add(tm.user_id);
      membersByEvent.set(tm.event_id, set);
    }

    const starts = activeTournaments
      .map((e) => e.tournament!.startsAt)
      .sort((a, b) => Date.parse(a) - Date.parse(b));
    const ends = activeTournaments
      .map((e) => e.tournament!.endsAt)
      .sort((a, b) => Date.parse(a) - Date.parse(b));
    solves = await solvesBetween([...allUserIds], starts[0], ends.at(-1)!);
  }

  return events.map((event) => {
    if (!event.tournament) return event;
    if (!teamByEvent.has(event.id) || now < Date.parse(event.tournament.startsAt)) {
      return { ...event, problems: [] };
    }
    if (!includeSolves) return event;
    const windowStart = Date.parse(event.tournament.startsAt);
    const windowEnd = Date.parse(event.tournament.endsAt);
    const allowedProblems = new Set((event.problems ?? []).map((p) => p.id));
    const teamUsers = membersByEvent.get(event.id) ?? new Set([viewerId]);
    const solvedInWindow = solves.filter((s) => {
      if (!teamUsers.has(s.userId) || !allowedProblems.has(s.problemId)) return false;
      if (!s.at) return true;
      const t = Date.parse(s.at);
      return t >= windowStart && t <= windowEnd;
    });
    return { ...event, solvedProblemIds: [...new Set(solvedInWindow.map((s) => s.problemId))] };
  });
}

export async function getEventsFeed(viewer: Viewer): Promise<EventsFeed> {
  const [memberships, advised, rows, viewerSolves] = await Promise.all([
    membershipsOf(viewer),
    advisedOrgsOf(viewer),
    fetchAllPages<EventRow>((from, to) =>
      db().from("events").select(EVENT_COLUMNS).order("starts_on", { ascending: false }).order("id").range(from, to),
    ),
    firstSolves(viewer.id),
  ]);
  const scope = scopeOf(viewer, memberships, advised);
  const visibleRows = rows.filter((r) => isEventRowVisible(r, scope));
  const visible = await toEvents(visibleRows);
  const events = await maskTournamentProblems(visible, viewer.id, true);
  const postableById = new Map<string, { id: string; name: string }>();
  for (const m of memberships) {
    if (can(m.role, "publish")) postableById.set(m.org_id, { id: m.org_id, name: m.orgs.name });
  }
  for (const o of advised) {
    postableById.set(o.id, { id: o.id, name: o.name });
  }
  return {
    events,
    postableOrgs: [...postableById.values()],
    solvedProblemIds: viewerSolves.map((s) => s.problemId),
    today: todayInManila(),
  };
}
