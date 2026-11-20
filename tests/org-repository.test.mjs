import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as orgRules from "../lib/orgs/rules.ts";
import { isObject, isUuid, text } from "../lib/accounts/rules.ts";
import { todayInManila } from "../lib/dates.ts";
import { exactCount, fakeDb, fetchAllPages, must } from "./fixtures/fake-db.mjs";

// The repositories are server-only, so they load through the same stubbed-require pattern as the app shell test.
function load(path, modules) {
  const source = readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const loaded = { exports: {} };
  vm.runInNewContext(output, {
    module: loaded, exports: loaded.exports, crypto, console,
    require: (name) => { if (name in modules) return modules[name]; throw Error(`unexpected import: ${name}`); },
  });
  return loaded.exports;
}

const MINE = "11111111-1111-4111-8111-111111111111";
const NIGHT = "22222222-2222-4222-8222-222222222222";
const THEIRS = "33333333-3333-4333-8333-333333333333";
const ORGS = { acoes: { name: "ACOES", campus_id: "santa-cruz", campus_name: "Santa Cruz" }, other: { name: "Other", campus_id: "siniloan", campus_name: "Siniloan" } };
const event = (id, org_id, access, featured = false) => ({ id, org_id, access, featured, title: id, summary: "s", starts_on: "2026-12-01", banner: "circuit", winners: null, orgs: ORGS[org_id] });
const member = (user_id, role) => ({ org_id: "acoes", user_id, role, orgs: ORGS.acoes, profiles: { display_name: user_id } });
const viewer = (id, campusId) => ({ id, name: id, campusId });

function harness() {
  const tables = {
    orgs: [{ id: "acoes", ...ORGS.acoes, school_name: "LSPU", program_name: "BSCPE", org_members: [{ count: 3 }] }],
    org_members: [member("pres", "president"), member("plain", "member"), member("target", "member")],
    org_applications: [],
    submissions: [],
    problems: [{ id: "created", title: "Created" }],
    tournament_members: [],
    events: [event(MINE, "acoes", "open"), event(NIGHT, "acoes", "campus-only"), event(THEIRS, "other", "open", true)],
  };
  const shared = { "server-only": {}, "@/lib/db/client": { db: fakeDb(tables), exactCount, fetchAllPages, must }, "@/lib/dates": { todayInManila: () => "2026-11-08" }, "@/lib/orgs/rules": orgRules };
  const competition = load("lib/competition/repository.ts", { ...shared, "@/lib/accounts/school-directory": { schoolDirectory: {} }, "./rank": { rankScores: () => [] }, "@/lib/judge/solves": { firstSolves: async () => [], solvesBetween: async () => [] }, "@/lib/problems/catalog": { getProblemById: (id) => (id === "known" ? { id, title: "Known", testCases: [{ input: "secret" }] } : null) } });
  const repository = load("lib/orgs/repository.ts", { ...shared, "@/lib/accounts/rules": { isObject, isUuid, text }, "@/lib/competition/repository": competition, "./rules": orgRules });
  return { tables, repository, competition };
}

test("a plain member cannot assign officers; the president can", async () => {
  const { tables, repository } = harness();
  const target = tables.org_members.find((m) => m.user_id === "target");
  const denied = await repository.performOrgAction("acoes", viewer("plain"), { action: "setOfficer", memberId: "target", officer: true });
  assert.equal(denied.ok, false);
  assert.equal(denied.status, 403);
  assert.equal(target.role, "member");
  assert.equal((await repository.performOrgAction("acoes", viewer("pres"), { action: "setOfficer", memberId: "target", officer: true })).ok, true);
  assert.equal(target.role, "officer");
});

test("an identity in the request body is ignored, so nobody can act as the president", async () => {
  const { tables, repository } = harness();
  const result = await repository.performOrgAction("acoes", viewer("plain"), { action: "setOfficer", actorId: "pres", memberId: "target", officer: true });
  assert.equal(result.status, 403);
  assert.equal(tables.org_members.find((m) => m.user_id === "target").role, "member");
});

test("choosing a dashboard event clears only the same org's choice", async () => {
  const { tables, repository } = harness();
  const featured = () => tables.events.filter((e) => e.featured).map((e) => e.id).sort();
  assert.equal((await repository.performOrgAction("acoes", viewer("pres"), { action: "feature", eventId: MINE })).ok, true);
  assert.deepEqual(featured(), [MINE, THEIRS]);
  assert.equal((await repository.performOrgAction("acoes", viewer("pres"), { action: "feature", eventId: NIGHT })).ok, true);
  assert.deepEqual(featured(), [NIGHT, THEIRS]);
});

test("accepting an application makes the applicant a member and clears it", async () => {
  const { tables, repository } = harness();
  assert.equal((await repository.performOrgAction("acoes", viewer("newbie"), { action: "apply", program: "BSCPE" })).ok, true);
  const application = tables.org_applications[0];
  application.status = "pending"; // the column default in the real database
  assert.equal(application.user_id, "newbie");
  assert.equal((await repository.performOrgAction("acoes", viewer("pres"), { action: "decide", applicationId: application.id, accept: true })).ok, true);
  assert.equal(tables.org_applications.length, 0);
  assert.ok(tables.org_members.some((m) => m.user_id === "newbie" && m.role === "member"));
});

test("the org page shows campus events to a non-member from that campus, as the Events feed does", async () => {
  const { repository } = harness();
  const ids = async (campus) => (await repository.getOrgDetail("acoes", viewer("visitor", campus))).events.map((e) => e.id);
  assert.deepEqual(await ids("santa-cruz"), [MINE, NIGHT]);
  assert.deepEqual(await ids("siniloan"), [MINE]);
  assert.deepEqual(await ids(undefined), [MINE]);
});

test("the events feed offers posting only to orgs the viewer can publish for", async () => {
  const { competition } = harness();
  const postable = async (id) => (await competition.getEventsFeed(viewer(id))).postableOrgs.map((o) => o.id).join();
  assert.equal(await postable("pres"), "acoes");
  assert.equal(await postable("plain"), "");
});

test("event problems expose only id and title, and unknown IDs are dropped", async () => {
  const { tables, competition } = harness();
  tables.events[0].problem_ids = ["known", "created", "gone"];
  const event = (await competition.getEventsFeed(viewer("pres"))).events.find((e) => e.id === MINE);
  assert.equal(JSON.stringify(event.problems), '[{"id":"known","title":"Known"},{"id":"created","title":"Created"}]');
});

test("a first solve earns points and a milestone; solving again earns none; judge outages are not recorded", async () => {
  const tables = { submissions: [] };
  const database = { db: fakeDb(tables), exactCount, fetchAllPages, must };
  const solves = load("lib/judge/solves.ts", { "server-only": {}, "@/lib/db/client": database });
  const { recordSubmission } = load("lib/judge/record-submission.ts", {
    "server-only": {}, "@/lib/db/client": database, "@/lib/auth/viewer": { getViewer: async () => viewer("u") }, "@/lib/judge/solves": solves,
  });
  const problem = { id: "p", difficulty: "intermediate" };
  const plain = (value) => JSON.parse(JSON.stringify(value));
  assert.deepEqual(plain(await recordSubmission(problem, "python", "ACCEPTED")), { firstSolve: true, points: 200, solved: 1 });
  assert.deepEqual(plain(await recordSubmission(problem, "java", "ACCEPTED")), { firstSolve: false, points: 0, solved: 1 });
  assert.equal(await recordSubmission(problem, "python", "WRONG_ANSWER"), null);
  assert.equal(await recordSubmission(problem, "python", "SERVICE_UNAVAILABLE"), null);
  assert.equal(tables.submissions.length, 3);
});

test("a targeted competition is shown only to its campuses and organizations", () => {
  const event = { access: "campus-only", campusId: "", orgId: "", audience: { campusIds: ["a", "b"], orgIds: ["club"] } };
  assert.equal(orgRules.canViewEvent(event, { campusIds: ["b"], orgIds: [] }), true);
  assert.equal(orgRules.canViewEvent(event, { campusIds: [], orgIds: ["club"] }), true);
  assert.equal(orgRules.canViewEvent(event, { campusIds: ["c"], orgIds: ["other"] }), false);
  assert.equal(orgRules.canViewEvent({ ...event, access: "open" }, { campusIds: [], orgIds: [] }), false);
});

test("today follows Manila's calendar, not UTC's", (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: Date.parse("2026-11-08T17:00:00Z") });
  assert.equal(todayInManila(), "2026-11-09");
});
