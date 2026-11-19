import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as orgRules from "../lib/orgs/rules.ts";
import { isObject, isUuid, text } from "../lib/accounts/rules.ts";
import { rankTeams } from "../lib/tournaments/standings.ts";
import { fakeDb, must } from "./fixtures/fake-db.mjs";

function load(path, modules) {
  const source = readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const loaded = { exports: {} };
  vm.runInNewContext(output, { module: loaded, exports: loaded.exports, crypto, Date, require: (name) => { if (name in modules) return modules[name]; throw Error(`unexpected import: ${name}`); } });
  return loaded.exports;
}

const ID = "11111111-1111-4111-8111-111111111111";
const iso = (minutes) => new Date(Date.now() + minutes * 60000).toISOString();
const viewer = (id) => ({ id, name: id, campusId: "sc" });
const org = { name: "O", campus_id: "sc", campus_name: "SC" };
const member = (team_id, user_id) => ({ event_id: ID, team_id, user_id, profiles: { display_name: user_id, avatar_id: "glitch-bot", border_id: "none" } });

function harness(startsIn, endsIn, { access = "campus-only", size = 2 } = {}) {
  const tables = {
    events: [{ id: ID, org_id: "o", title: "T", summary: "s", starts_on: "2026-11-09", access, banner: "podium", featured: false, winners: null, problem_ids: ["p1", "p2"], starts_at: iso(startsIn), ends_at: iso(endsIn), team_size: size, orgs: org }],
    org_members: [],
    tournament_teams: [{ id: "t1", event_id: ID, name: "Alpha" }],
    tournament_members: [member("t1", "a")],
    submissions: [],
    tournament_violations: [],
  };
  const database = { db: fakeDb(tables), must };
  const solves = load("lib/judge/solves.ts", { "server-only": {}, "@/lib/db/client": database });
  const competition = load("lib/competition/repository.ts", {
    "server-only": {}, "@/lib/db/client": database, "@/lib/dates": { todayInManila: () => "2026-11-09" }, "@/lib/orgs/rules": orgRules, "@/lib/accounts/school-directory": { schoolDirectory: {} },
    "./rank": { rankScores: () => [] }, "@/lib/judge/solves": solves, "@/lib/problems/catalog": { getProblemById: (id) => ({ id, title: id }) },
  });
  const repo = load("lib/tournaments/repository.ts", {
    "server-only": {}, "@/lib/db/client": database, "@/lib/accounts/rules": { isObject, isUuid, text }, "@/lib/competition/repository": competition, "@/lib/judge/solves": solves, "@/lib/orgs/rules": orgRules, "./standings": { rankTeams },
  });
  return { tables, repo, competition };
}

const solve = (userId, problemId, points, at) => ({ userId, problemId, points, at });

test("teams rank by points, each problem counts once, and the earlier finish breaks ties", () => {
  const teams = [{ id: "slow", memberIds: ["a"] }, { id: "fast", memberIds: ["b", "c"] }, { id: "none", memberIds: ["d"] }];
  const ranked = rankTeams(teams, [solve("a", "p1", 100, "2026-01-01T00:05:00Z"), solve("b", "p1", 100, "2026-01-01T00:01:00Z"), solve("c", "p1", 100, "2026-01-01T00:02:00Z"), solve("a", "other", 999, "2026-01-01T00:00:00Z")], ["p1"]);
  assert.deepEqual(ranked.map((t) => [t.teamId, t.points, t.rank]), [["fast", 100, 1], ["slow", 100, 2], ["none", 0, 3]]);
});

test("problems stay hidden during registration and from unregistered students", async () => {
  const before = harness(5, 30);
  assert.equal((await before.repo.getTournament(viewer("a"), ID)).problems.length, 0);
  assert.equal((await before.competition.getEventsFeed(viewer("a"))).events[0].problems.length, 0);
  const during = harness(-5, 30);
  assert.equal((await during.repo.getTournament(viewer("a"), ID)).problems.length, 2);
  assert.equal((await during.repo.getTournament(viewer("stranger"), ID)).problems.length, 0);
  assert.equal((await during.competition.getEventsFeed(viewer("a"))).events[0].problems.length, 2);
});

test("registration closes at the start, teams have a size limit, and nobody joins twice", async () => {
  const closed = harness(-1, 30);
  assert.equal((await closed.repo.performTournamentAction(viewer("b"), ID, { action: "joinTeam", teamId: "t1" })).status, 409);
  const { tables, repo } = harness(5, 30);
  assert.equal((await repo.performTournamentAction(viewer("b"), ID, { action: "joinTeam", teamId: "t1" })).ok, true);
  assert.equal((await repo.performTournamentAction(viewer("b"), ID, { action: "createTeam", name: "Beta" })).status, 409);
  tables.tournament_members[1].profiles = member("t1", "b").profiles;
  assert.equal((await repo.performTournamentAction(viewer("c"), ID, { action: "joinTeam", teamId: "t1" })).error, "That team is full.");
});

test("a campus-only tournament is hidden from other campuses, and bad IDs are not found", async () => {
  const { repo } = harness(5, 30);
  assert.equal(await repo.getTournament({ id: "x", name: "x", campusId: "elsewhere" }, ID), null);
  assert.equal(await repo.getTournament(viewer("a"), "not-a-uuid"), null);
});

test("the lockdown applies only to registered students while the tournament is live", async () => {
  const live = harness(-5, 30);
  assert.equal((await live.repo.getActiveTournament(viewer("a"))).id, ID);
  assert.equal(await live.repo.getActiveTournament(viewer("stranger")), null);
  assert.equal(await harness(5, 30).repo.getActiveTournament(viewer("a")), null);
  assert.equal(await harness(-30, -1).repo.getActiveTournament(viewer("a")), null);
});

test("warnings are counted on the team, only while live and only for members", async () => {
  const live = harness(-5, 30);
  assert.equal((await live.repo.performTournamentAction(viewer("a"), ID, { action: "violation", kind: "tab" })).ok, true);
  assert.equal((await live.repo.performTournamentAction(viewer("stranger"), ID, { action: "violation", kind: "tab" })).ok, true);
  assert.equal((await live.repo.performTournamentAction(viewer("a"), ID, { action: "violation", kind: "nonsense" })).status, 400);
  assert.equal(live.tables.tournament_violations.length, 1);
  assert.equal((await live.repo.getTournament(viewer("a"), ID)).teams[0].warnings, 1);
  assert.equal((await live.repo.getActiveTournament(viewer("a"))).warnings, 1);
  const before = harness(5, 30);
  await before.repo.performTournamentAction(viewer("a"), ID, { action: "violation", kind: "tab" });
  assert.equal(before.tables.tournament_violations.length, 0);
});

test("scores stay hidden until the tournament ends", async () => {
  const live = harness(-5, 30);
  live.tables.submissions.push({ user_id: "a", problem_id: "p1", points: 100, verdict: "ACCEPTED", created_at: iso(-1) });
  const during = (await live.repo.getTournament(viewer("a"), ID)).teams[0];
  assert.deepEqual([during.points, during.solved, during.rank], [0, 0, undefined]);
  assert.equal((await live.repo.getTournament(viewer("a"), ID)).solvedProblemIds.join(), "p1");
  const done = harness(-30, -1);
  done.tables.submissions.push({ user_id: "a", problem_id: "p1", points: 100, verdict: "ACCEPTED", created_at: iso(-5) });
  const after = (await done.repo.getTournament(viewer("a"), ID)).teams[0];
  assert.deepEqual([after.points, after.solved, after.rank], [100, 1, 1]);
});

test("the lock lifts once the team has solved every problem", async () => {
  const live = harness(-5, 30);
  const accepted = (problem_id) => ({ user_id: "a", problem_id, points: 100, verdict: "ACCEPTED", created_at: iso(-1) });
  live.tables.submissions.push(accepted("p1"));
  assert.equal((await live.repo.getActiveTournament(viewer("a"))).id, ID);
  live.tables.submissions.push(accepted("p2"));
  assert.equal(await live.repo.getActiveTournament(viewer("a")), null);
});

test("medals need a finished tournament, a top 3 place and points", async () => {
  const running = harness(-30, 10);
  running.tables.submissions.push({ user_id: "a", problem_id: "p1", points: 100, verdict: "ACCEPTED", created_at: iso(-5) });
  assert.equal((await running.repo.getMedals("a")).length, 0);
  const done = harness(-30, -1);
  assert.equal((await done.repo.getMedals("a")).length, 0);
  done.tables.submissions.push({ user_id: "a", problem_id: "p1", points: 100, verdict: "ACCEPTED", created_at: iso(-5) });
  const medals = await done.repo.getMedals("a");
  assert.equal(medals.length, 1);
  assert.equal(medals[0].place, 1);
});
