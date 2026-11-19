import "server-only";
import { isObject, isUuid, text } from "@/lib/accounts/rules";
import type { Viewer } from "@/lib/auth/viewer";
import type { AvatarBorderId } from "@/lib/avatar-borders";
import { EVENT_COLUMNS, toEvents, viewerScope, type EventRow } from "@/lib/competition/repository";
import { db, must } from "@/lib/db/client";
import { solvesBetween } from "@/lib/judge/solves";
import { canViewEvent, eventAccessLabel } from "@/lib/orgs/rules";
import type { ActiveTournament, Medal, TournamentStatus, TournamentView } from "@/types/tournament";
import { rankTeams, type TeamEntry } from "./standings";

export type TournamentActionResult = { ok: true } | { ok: false; status: number; error: string };

type TeamRow = { id: string; name: string };
type MemberRow = { team_id: string; user_id: string; profiles: { display_name: string; avatar_id: string; border_id: string } };

const UNIQUE_VIOLATION = "23505";
const VIOLATION_KINDS = ["fullscreen", "tab", "focus"];
const MEMBER_COLUMNS = "team_id,user_id,profiles(display_name,avatar_id,border_id)";
const failed = (status: number, error: string): TournamentActionResult => ({ ok: false, status, error });

const statusAt = (now: number, startsAt: string, endsAt: string): TournamentStatus =>
  now < Date.parse(startsAt) ? "registration" : now < Date.parse(endsAt) ? "live" : "ended";

/** Hidden tournaments answer exactly like missing ones. */
async function loadVisible(viewer: Viewer, id: string) {
  if (!isUuid(id)) return null;
  const row = must(await db().from("events").select(EVENT_COLUMNS).eq("id", id).maybeSingle()) as unknown as EventRow | null;
  if (!row?.starts_at || !row.ends_at) return null;
  const [event] = await toEvents([row]);
  if (!canViewEvent(event, await viewerScope(viewer))) return null;
  return { row, event, startsAt: row.starts_at, endsAt: row.ends_at, teamSize: row.team_size ?? 1 };
}

async function loadRoster(eventId: string) {
  const teams = must(await db().from("tournament_teams").select("id,name").eq("event_id", eventId).order("name")) as TeamRow[];
  const members = must(await db().from("tournament_members").select(MEMBER_COLUMNS).eq("event_id", eventId)) as unknown as MemberRow[];
  return { teams, members };
}

function groupMembersByTeam(members: MemberRow[]): Map<string, MemberRow[]> {
  const byTeam = new Map<string, MemberRow[]>();
  for (const member of members) {
    const list = byTeam.get(member.team_id);
    if (list) list.push(member);
    else byTeam.set(member.team_id, [member]);
  }
  return byTeam;
}

const entries = (teams: TeamRow[], byTeam: Map<string, MemberRow[]>): TeamEntry[] =>
  teams.map((t) => ({ id: t.id, memberIds: (byTeam.get(t.id) ?? []).map((m) => m.user_id) }));

export async function getTournament(viewer: Viewer, id: string): Promise<TournamentView | null> {
  const found = await loadVisible(viewer, id);
  if (!found) return null;
  const { event, startsAt, endsAt, teamSize } = found;
  const now = Date.now();
  const status = statusAt(now, startsAt, endsAt);
  const { teams, members } = await loadRoster(id);
  const membersByTeam = groupMembersByTeam(members);
  const teamByUser = new Map(members.map((m) => [m.user_id, m.team_id]));
  const problemIds = (event.problems ?? []).map((p) => p.id);
  const solves = status === "registration" ? [] : await solvesBetween(members.map((m) => m.user_id), startsAt, endsAt);
  const standings = rankTeams(entries(teams, membersByTeam), solves, problemIds);
  const standingByTeam = new Map(standings.map((s) => [s.teamId, s]));
  const myTeamId = teamByUser.get(viewer.id) ?? null;
  const open = status !== "registration" && myTeamId !== null;
  const teamMembers = new Set((myTeamId ? membersByTeam.get(myTeamId) ?? [] : []).map((m) => m.user_id));
  const violations = must(await db().from("tournament_violations").select("user_id").eq("event_id", id)) as { user_id: string }[];
  const warningsByTeam = new Map<string, number>();
  for (const v of violations) {
    const teamId = teamByUser.get(v.user_id);
    if (teamId) warningsByTeam.set(teamId, (warningsByTeam.get(teamId) ?? 0) + 1);
  }

  const view = teams.map((team) => {
    const standing = standingByTeam.get(team.id);
    return {
      id: team.id,
      name: team.name,
      members: (membersByTeam.get(team.id) ?? []).map((m) => ({
        id: m.user_id,
        name: m.profiles.display_name,
        avatarId: m.profiles.avatar_id,
        borderId: m.profiles.border_id as AvatarBorderId,
      })),
      // Scores stay on the server until the end, so the standings can't be read early.
      points: status === "ended" ? standing?.points ?? 0 : 0,
      solved: status === "ended" ? standing?.solved ?? 0 : 0,
      warnings: warningsByTeam.get(team.id) ?? 0,
      rank: status === "ended" ? standing?.rank : undefined,
    };
  });

  return {
    id, title: event.title, summary: event.summary, accessLabel: eventAccessLabel(event), status, startsAt, endsAt, now: new Date(now).toISOString(),
    teamSize, myTeamId,
    teams: status === "ended" ? view.sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0)) : view,
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
      const { error: memberError } = await db().from("tournament_members").insert({ event_id: id, team_id: teamId, user_id: viewer.id });
      if (memberError) {
        await db().from("tournament_teams").delete().eq("id", teamId);
        if (memberError.code === UNIQUE_VIOLATION) return failed(409, "You're already on a team.");
        throw new Error(`Database error: ${memberError.message}`);
      }
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
      const remaining = must(await db().from("tournament_members").select("user_id").eq("team_id", mine.team_id).limit(1)) as { user_id: string }[];
      if (remaining.length === 0) must(await db().from("tournament_teams").delete().eq("id", mine.team_id));
      return { ok: true };
    }
    default:
      return failed(400, "Unknown action.");
  }
}

/** The tournament this student must be locked into right now, if any. A team that has solved everything is free to go. */
export async function getActiveTournament(viewer: Viewer): Promise<ActiveTournament | null> {
  const joined = must(await db().from("tournament_members").select("event_id,team_id").eq("user_id", viewer.id)) as { event_id: string; team_id: string }[];
  if (joined.length === 0) return null;
  const rows = must(await db().from("events").select(EVENT_COLUMNS).in("id", joined.map((j) => j.event_id))) as unknown as EventRow[];
  const now = Date.now();
  const liveRows = rows.filter((row) => row.starts_at && row.ends_at && statusAt(now, row.starts_at, row.ends_at) === "live");
  if (liveRows.length === 0) return null;
  // Resolve through toEvents so problems deleted after scheduling drop out instead of trapping the team in lockdown.
  const liveById = new Map((await toEvents(liveRows)).map((event) => [event.id, event]));
  for (const { event_id: eventId, team_id: teamId } of joined) {
    const event = liveById.get(eventId);
    if (!event?.tournament) continue;
    const team = must(await db().from("tournament_members").select("user_id").eq("team_id", teamId)) as { user_id: string }[];
    const solved = new Set((await solvesBetween(team.map((m) => m.user_id), event.tournament.startsAt, event.tournament.endsAt)).map((s) => s.problemId));
    const problems = (event.problems ?? []).map((p) => p.id);
    if (problems.length > 0 && problems.every((problemId) => solved.has(problemId))) continue;
    const violations = must(await db().from("tournament_violations").select("id").eq("event_id", eventId).eq("user_id", viewer.id)) as unknown[];
    return { id: event.id, title: event.title, warnings: violations.length };
  }
  return null;
}

/** Top 3 finishes in tournaments that have ended. A team with no points earns nothing. */
export async function getMedals(userId: string): Promise<Medal[]> {
  const joined = must(await db().from("tournament_members").select("event_id,team_id").eq("user_id", userId)) as { event_id: string; team_id: string }[];
  if (joined.length === 0) return [];
  const rows = must(await db().from("events").select(EVENT_COLUMNS).in("id", joined.map((j) => j.event_id))) as unknown as EventRow[];
  const now = Date.now();
  const endedRows = rows.filter((row) => row.starts_at && row.ends_at && now >= Date.parse(row.ends_at));
  if (endedRows.length === 0) return [];
  const endedById = new Map((await toEvents(endedRows)).map((event) => [event.id, event]));
  const medals: Medal[] = [];
  for (const { event_id: eventId, team_id: teamId } of joined) {
    const event = endedById.get(eventId);
    if (!event?.tournament) continue;
    const { teams, members } = await loadRoster(eventId);
    const solves = await solvesBetween(members.map((m) => m.user_id), event.tournament.startsAt, event.tournament.endsAt);
    const problemIds = (event.problems ?? []).map((p) => p.id);
    const mine = rankTeams(entries(teams, groupMembersByTeam(members)), solves, problemIds).find((s) => s.teamId === teamId);
    if (mine && mine.rank <= 3 && mine.points > 0) medals.push({ place: mine.rank, at: event.tournament.endsAt, title: event.title });
  }
  return medals;
}
