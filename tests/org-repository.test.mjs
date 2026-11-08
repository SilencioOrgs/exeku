import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as orgRules from "../lib/orgs/rules.ts";
import { isObject, text } from "../lib/accounts/rules.ts";
import { todayInManila } from "../lib/dates.ts";

// The repositories are server-only, so they load through the same stubbed-require pattern as the app shell test.
function load(path, modules) {
  const source = readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const loaded = { exports: {} };
  vm.runInNewContext(output, {
    module: loaded, exports: loaded.exports, crypto,
    require: (name) => { if (name in modules) return modules[name]; throw Error(`unexpected import: ${name}`); },
  });
  return loaded.exports;
}

const event = (id, orgId, access, campusId, featured = false) => ({ id, orgId, access, campusId, featured, startsOn: "2026-12-01" });
function harness() {
  const mockDb = {
    orgs: [{ id: "acoes", name: "ACOES", campusId: "santa-cruz", campusName: "Santa Cruz" }, { id: "other", name: "Other", campusId: "siniloan", campusName: "Siniloan" }],
    members: [
      { orgId: "acoes", id: "pres", name: "Asnor", role: "president" },
      { orgId: "acoes", id: "plain", name: "Al Thor", role: "member" },
      { orgId: "acoes", id: "target", name: "Jan Eriz", role: "member" },
    ],
    applications: [],
    events: [event("mine", "acoes", "open", "santa-cruz"), event("night", "acoes", "campus-only", "santa-cruz"), event("theirs", "other", "open", "siniloan", true)],
    scores: [],
  };
  const shared = { "server-only": {}, "@/lib/mock/db": { mockDb }, "@/lib/dates": { todayInManila: () => "2026-11-08" }, "@/lib/orgs/rules": orgRules };
  const competition = load("lib/competition/repository.ts", { ...shared, "@/lib/accounts/school-directory": { schoolDirectory: {} }, "./rank": { rankScores: () => [] } });
  const repository = load("lib/orgs/repository.ts", { ...shared, "@/lib/accounts/rules": { isObject, text }, "@/lib/competition/repository": competition, "./rules": orgRules });
  return { mockDb, repository };
}

test("a plain member cannot assign officers; the president can", async () => {
  const { mockDb, repository } = harness();
  const target = mockDb.members.find((m) => m.id === "target");
  const denied = await repository.performOrgAction("acoes", { action: "setOfficer", actorId: "plain", memberId: "target", officer: true });
  assert.equal(denied.ok, false);
  assert.equal(denied.status, 403);
  assert.equal(target.role, "member");
  assert.equal((await repository.performOrgAction("acoes", { action: "setOfficer", actorId: "pres", memberId: "target", officer: true })).ok, true);
  assert.equal(target.role, "officer");
});

test("choosing a dashboard event clears only the same org's choice", async () => {
  const { mockDb, repository } = harness();
  const featured = () => mockDb.events.filter((e) => e.featured).map((e) => e.id).sort();
  assert.equal((await repository.performOrgAction("acoes", { action: "feature", actorId: "pres", eventId: "mine" })).ok, true);
  assert.deepEqual(featured(), ["mine", "theirs"]);
  assert.equal((await repository.performOrgAction("acoes", { action: "feature", actorId: "pres", eventId: "night" })).ok, true);
  assert.deepEqual(featured(), ["night", "theirs"]);
});

test("the org page shows campus events to a non-member from that campus, as the Events feed does", async () => {
  const { repository } = harness();
  const ids = async (campus) => (await repository.getOrgDetail("acoes", "visitor", campus)).events.map((e) => e.id);
  assert.deepEqual(await ids("santa-cruz"), ["mine", "night"]);
  assert.deepEqual(await ids("siniloan"), ["mine"]);
  assert.deepEqual(await ids(undefined), ["mine"]);
});

test("today follows Manila's calendar, not UTC's", (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: Date.parse("2026-11-08T17:00:00Z") });
  assert.equal(todayInManila(), "2026-11-09");
});
