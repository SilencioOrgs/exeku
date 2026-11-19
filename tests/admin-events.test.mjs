import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { isObject, isUuid, text } from "../lib/accounts/rules.ts";
import * as rules from "../lib/admin/rules.ts";
import { fakeDb, must } from "./fixtures/fake-db.mjs";

const { checkSchedule, checkSet } = rules;
const SET_ID = "11111111-1111-4111-8111-111111111111";
const EVENT_ID = "22222222-2222-4222-8222-222222222222";

function harness() {
  const tables = {
    problem_sets: [{ id: SET_ID, name: "Warm-up", problem_ids: ["a", "b", "deleted"] }],
    orgs: [{ id: "o1", name: "Host" }, { id: "o2", name: "Second" }],
    schools: [{ short_name: "LSPU", campuses: [{ id: "sc", name: "Santa Cruz" }, { id: "sp", name: "San Pablo" }] }],
    events: [],
  };
  const source = readFileSync(new URL("../lib/admin/events.ts", import.meta.url), "utf8");
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const loaded = { exports: {} };
  const modules = {
    "server-only": {}, "@/lib/accounts/rules": { isObject, isUuid, text }, "@/lib/db/client": { db: fakeDb(tables), must }, "./rules": rules,
    "@/lib/problems/store": {
      listProblemIds: async () => ["a", "b"],
      listProblemSummaries: async () => [{ id: "a", title: "A", difficulty: "beginner" }, { id: "b", title: "B", difficulty: "advanced" }],
    },
  };
  vm.runInNewContext(output, { module: loaded, exports: loaded.exports, require: (name) => { if (name in modules) return modules[name]; throw Error(`unexpected import: ${name}`); } });
  return { tables, repo: loaded.exports };
}

const NOW = Date.parse("2026-11-09T12:00:00Z");
const later = (minutes) => new Date(Date.now() + minutes * 60000).toISOString();

test("a schedule computes its end and Manila date, and refuses the past and odd lengths", () => {
  const ok = checkSchedule({ startsAt: "2026-11-09T20:00:00Z", minutes: 30 }, NOW);
  assert.equal(ok.schedule.endsAt, "2026-11-09T20:30:00.000Z");
  assert.equal(ok.schedule.startsOn, "2026-11-10");
  assert.equal(checkSchedule({ startsAt: "2026-11-09T11:00:00Z", minutes: 30 }, NOW).ok, false);
  assert.equal(checkSchedule({ startsAt: "2026-11-09T20:00:00Z", minutes: 2 }, NOW).ok, false);
  assert.equal(checkSchedule({ startsAt: "nonsense", minutes: 30 }, NOW).ok, false);
});

test("a set needs a name and problems that exist", () => {
  const known = new Set(["a"]);
  assert.equal(checkSet({ name: "Round", problemIds: ["a", "a"] }, known).problemIds.length, 1);
  assert.equal(checkSet({ name: "Round", problemIds: ["ghost"] }, known).ok, false);
  assert.equal(checkSet({ name: "Round", problemIds: [] }, known).ok, false);
  assert.equal(checkSet({ name: "", problemIds: ["a"] }, known).ok, false);
});

test("scheduling a set creates a tournament with its live problems and chosen time", async () => {
  const { tables, repo } = harness();
  const startsAt = later(60);
  const result = await repo.createEvent({ setId: SET_ID, orgId: "o1", title: "Friday round", access: "campus-only", startsAt, minutes: 45, teamSize: 2 });
  assert.equal(result.ok, true);
  const [event] = tables.events;
  assert.equal(JSON.stringify(event.problem_ids), JSON.stringify(["a", "b"]));
  assert.equal(event.starts_at, startsAt);
  assert.equal(Date.parse(event.ends_at) - Date.parse(event.starts_at), 45 * 60000);
  assert.equal(event.team_size, 2);
});

test("a missing set or host is refused, and nothing is created", async () => {
  const { tables, repo } = harness();
  const base = { title: "Round", access: "open", startsAt: later(60), minutes: 30, teamSize: 3 };
  assert.equal((await repo.createEvent({ ...base, setId: "nope", orgId: "o1" })).status, 404);
  assert.equal((await repo.createEvent({ ...base, setId: SET_ID, orgId: "nope" })).status, 422);
  assert.equal(tables.events.length, 0);
});

test("rescheduling changes only the time", async () => {
  const { tables, repo } = harness();
  tables.events.push({ id: EVENT_ID, title: "Keep", starts_at: later(1), ends_at: later(31) });
  const startsAt = later(120);
  assert.equal((await repo.rescheduleEvent({ id: EVENT_ID, startsAt, minutes: 60 })).ok, true);
  assert.equal(tables.events[0].title, "Keep");
  assert.equal(tables.events[0].starts_at, startsAt);
  assert.equal(Date.parse(tables.events[0].ends_at) - Date.parse(startsAt), 60 * 60000);
});

const competition = (over = {}) => ({ title: "CPE Days", startsAt: later(60), minutes: 60, teamSize: 3, everyone: false, campusIds: ["sc"], orgIds: ["o2"], problemIds: ["a", "b"], ...over });

test("a competition targets the chosen campuses and organizations", async () => {
  const { tables, repo } = harness();
  assert.equal((await repo.createCompetition(competition())).ok, true);
  const [event] = tables.events;
  assert.equal(JSON.stringify([event.campus_ids, event.org_ids, event.problem_ids]), JSON.stringify([["sc"], ["o2"], ["a", "b"]]));
  assert.equal(event.org_id, "o2");
  assert.equal(event.audience_label, "LSPU Santa Cruz, Second");
  assert.equal(event.team_size, 3);
});

test("a campus-only competition has no host, and an open one has no audience", async () => {
  const { tables, repo } = harness();
  await repo.createCompetition(competition({ orgIds: [] }));
  await repo.createCompetition(competition({ everyone: true, campusIds: ["sc"] }));
  assert.equal(tables.events[0].org_id, null);
  assert.equal(tables.events[0].access, "campus-only");
  assert.equal(tables.events[1].access, "open");
  assert.equal(tables.events[1].campus_ids.length, 0);
  assert.equal(tables.events[1].audience_label, null);
});

test("a competition needs an audience and real problems, and bad requests save nothing", async () => {
  const { tables, repo } = harness();
  assert.ok((await repo.createCompetition(competition({ campusIds: [], orgIds: [] }))).fieldErrors.audience);
  assert.ok((await repo.createCompetition(competition({ campusIds: ["ghost"] }))).fieldErrors.audience);
  assert.ok((await repo.createCompetition(competition({ problemIds: [] }))).fieldErrors.problemIds);
  assert.ok((await repo.createCompetition(competition({ problemIds: ["ghost"] }))).fieldErrors.problemIds);
  assert.equal(tables.events.length, 0);
});

test("the overview drops deleted problems from a set", async () => {
  const { repo } = harness();
  const overview = await repo.getEventsOverview();
  assert.equal(overview.sets[0].problems.map((p) => p.id).join(), "a,b");
});
