import "server-only";
import { isObject, text } from "@/lib/accounts/rules";
import type { Viewer } from "@/lib/auth/viewer";
import type { AvatarBorderId } from "@/lib/avatar-borders";
import { EVENT_COLUMNS, toEvent, viewerScope, type EventRow } from "@/lib/competition/repository";
import { db, must } from "@/lib/db/client";
import { solvesBetween } from "@/lib/judge/solves";
import { canViewEvent, eventAccessLabel } from "@/lib/orgs/rules";
import type { ActiveTournament, Medal, TournamentStatus, TournamentView } from "@/types/tournament";
import { rankTeams, type TeamEntry } from "./standings";

export type TournamentActionResult = { ok: true } | { ok: false; status: number; error: string };

type TeamRow = { id: string; name: string };
type MemberRow = { team_id: string; user_id: string; profiles: { display_name: string; avatar_id: string; border_id: string } };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UNIQUE_VIOLATION = "23505";
const VIOLATION_KINDS = ["fullscreen", "tab", "focus"];
const MEMBER_COLUMNS = "team_id,user_id,profiles(display_name,avatar_id,border_id)";
const failed = (status: number, error: string): TournamentActionResult => ({ ok: false, status, error });

const statusAt = (now: number, startsAt: string, endsAt: string): TournamentStatus =>
  now < Date.parse(startsAt) ? "registration" : now < Date.parse(endsAt) ? "live" : "ended";

/** Hidden tournaments answer exactly like missing ones. */
async function loadVisible(viewer: Viewer, id: string) {
  if (!UUID.test(id)) return null;
  const row = must(await db().from("events").select(EVENT_COLUMNS).eq("id", id).maybeSingle()) as unknown as EventRow | null;
  if (!row?.starts_at || !row.ends_at) return null;
  const event = toEvent(row);
  if (!canViewEvent(event, await viewerScope(viewer))) return null;
  return { row, event, startsAt: row.starts_at, endsAt: row.ends_at, teamSize: row.team_size ?? 1 };
}

async function loadRoster(eventId: string) {
  const teams = must(await db().from("tournament_teams").select("id,name").eq("event_id", eventId).order("name")) as TeamRow[];
  const members = must(await db().from("tournament_members").select(MEMBER_COLUMNS).eq("event_id", eventId)) as unknown as MemberRow[];
  return { teams, members };
}

const entries = (teams: TeamRow[], members: MemberRow[]): TeamEntry[] =>
  teams.map((t) => ({ id: t.id, memberIds: members.filter((m) => m.team_id === t.id).map((m) => m.user_id) }));

export async function getTournament(viewer: Viewer, id: string): Promise<TournamentView | null> {
  const found = await loadVisible(viewer, id);
  if (!found) return null;
  const { event, startsAt, endsAt, teamSize } = found;
  const now = Date.now();
  const status = statusAt(now, startsAt, endsAt);
  const { teams, members } = await loadRoster(id);
  const problemIds = (event.problems ?? []).map((p) => p.id);
  const solves = status === "registration" ? [] : await solvesBetween(members.map((m) => m.user_id), startsAt, endsAt);
  const standings = rankTeams(entries(teams, members), solves, problemIds);
  const myTeamId = members.find((m) => m.user_id === viewer.id)?.team_id ?? null;
  const open = status !== "registration" && myTeamId !== null;
  const teamMembers = new Set(members.filter((m) => m.team_id === myTeamId).map((m) => m.user_id));
  const violations = must(await db().from("tournament_violations").select("user_id").eq("event_id", id)) as { user_id: string }[];

  const view = teams.map((team) => {
    const standing = standings.find((s) => s.teamId === team.id);
    return {
      id: team.id,
      name: team.name,
      members: members.filter((m) => m.team_id === team.id).map((m) => ({ id: m.user_id, name: m.profiles.display_name, avatarId: m.profiles.avatar_id, borderId: m.profiles.border_id as AvatarBorderId })),
      points: standing?.points ?? 0,
      solved: standing?.solved ?? 0,
      warnings: violations.filter((v) => members.some((m) => m.team_id === team.id && m.user_id === v.user_id)).length,
      rank: status === "registration" ? undefined : standing?.rank,
    };
  });

  return {
    id, title: event.title, summary: event.summary, accessLabel: eventAccessLabel(event), status, startsAt, endsAt, now: new Date(now).toISOString(),
    teamSize, myTeamId,
    teams: status === "registration" ? view : view.sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0)),
    problems: open ? event.problems ?? [] : [],
    solvedProblemIds: open ? solves.filter((s) => teamMembers.has(s.userId) && problemIds.includes(s.problemId)).map((s) => s.problemId) : [],
  };
}

export async function performTournamentAction(viewer: Viewer, id: string, input: unknown): Promise<TournamentActionResult> {
  const found = await loadVisible(viewer, id);
  if (!found) return failed(404, "That tournament wasn't found.");
  if (!isObject(input)) return failed(400, "Invalid request.");
  const status = statusAt(Date.now(), found.startsAt, found.endsAt);
  const { teams, members } = await loadRoster(id);
  const mine = members.find((m) => m.user_id === viewer.id);

  if (input.action === "violation") {
    const kind = text(input, "kind");
    if (!VIOLATION_KINDS.includes(kind)) return failed(400, "Unknown violation.");
    if (status === "live" && mine) must(await db().from("tournament_violations").insert({ event_id: id, user_id: viewer.id, kind }));
    return { ok: true };
  }
  if (status !== "registration") return failed(409, "Registration has closed.");

  switch (input.action) {
    case "createTeam": {
      if (mine) return failed(409, "You're already on a team.");
      const name = text(input, "name");
      if (name.length < 2 || name.length > 40) return failed(422, "Enter a team name of 2 to 40 characters.");
      const teamId = crypto.randomUUID();
      const { error } = await db().from("tournament_teams").insert({ id: teamId, event_id: id, name });
      if (error?.code === UNIQUE_VIOLATION) return failed(409, "That team name is taken.");
      if (error) throw new Error(`Database error: ${error.message}`);
      must(await db().from("tournament_members").insert({ event_id: id, team_id: teamId, user_id: viewer.id }));
      return { ok: true };
    }
    case "joinTeam": {
      if (mine) return failed(409, "You're already on a team.");
      const teamId = text(input, "teamId");
      if (!teams.some((t) => t.id === teamId)) return failed(404, "That team wasn't found.");
      // shortcut: two students joining the last slot at the same instant can exceed the size, enforce in SQL for large public tournaments.
      if (members.filter((m) => m.team_id === teamId).length >= found.teamSize) return failed(409, "That team is full.");
      const { error } = await db().from("tournament_members").insert({ event_id: id, team_id: teamId, user_id: viewer.id });
      if (error?.code === UNIQUE_VIOLATION) return failed(409, "You're already on a team.");
      if (error) throw new Error(`Database error: ${error.message}`);
      return { ok: true };
    }
    case "leave": {
      if (!mine) return { ok: true };
      must(await db().from("tournament_members").delete().eq("event_id", id).eq("user_id", viewer.id));
      if (members.filter((m) => m.team_id === mine.team_id).length === 1) must(await db().from("tournament_teams").delete().eq("id", mine.team_id));
      return { ok: true };
    }
    default:
      return failed(400, "Unknown action.");
  }
}

/** The tournament this student must be locked into right now, if any. */
export async function getActiveTournament(viewer: Viewer): Promise<ActiveTournament | null> {
  const joined = must(await db().from("tournament_members").select("event_id").eq("user_id", viewer.id)) as { event_id: string }[];
  for (const { event_id: eventId } of joined) {
    const row = must(await db().from("events").select("id,title,starts_at,ends_at").eq("id", eventId).maybeSingle()) as { id: string; title: string; starts_at: string | null; ends_at: string | null } | null;
    if (!row?.starts_at || !row.ends_at || statusAt(Date.now(), row.starts_at, row.ends_at) !== "live") continue;
    const violations = must(await db().from("tournament_violations").select("id").eq("event_id", eventId).eq("user_id", viewer.id)) as unknown[];
    return { id: row.id, title: row.title, warnings: violations.length };
  }
  return null;
}

/** Top 3 finishes in tournaments that have ended. A team with no points earns nothing. */
export async function getMedals(userId: string): Promise<Medal[]> {
  const joined = must(await db().from("tournament_members").select("event_id,team_id").eq("user_id", userId)) as { event_id: string; team_id: string }[];
  const medals: Medal[] = [];
  for (const { event_id: eventId, team_id: teamId } of joined) {
    const row = must(await db().from("events").select(EVENT_COLUMNS).eq("id", eventId).maybeSingle()) as unknown as EventRow | null;
    if (!row?.starts_at || !row.ends_at || Date.now() < Date.parse(row.ends_at)) continue;
    const { teams, members } = await loadRoster(eventId);
    const solves = await solvesBetween(members.map((m) => m.user_id), row.starts_at, row.ends_at);
    const mine = rankTeams(entries(teams, members), solves, row.problem_ids ?? []).find((s) => s.teamId === teamId);
    if (mine && mine.rank <= 3 && mine.points > 0) medals.push({ place: mine.rank, at: row.ends_at, title: row.title });
  }
  return medals;
}
