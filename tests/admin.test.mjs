import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { isObject, text } from "../lib/accounts/rules.ts";
import * as catalog from "../lib/problems/catalog.ts";
import { checkNewProblem, slugify } from "../lib/problems/rules.ts";
import { ALL_SUPPORTED_LANGUAGES, getStarterCode } from "../lib/workspace-defaults.ts";
import { fakeDb, must } from "./fixtures/fake-db.mjs";

function load(path, modules) {
  const source = readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const loaded = { exports: {} };
  vm.runInNewContext(output, { module: loaded, exports: loaded.exports, Date, require: (name) => { if (name in modules) return modules[name]; throw Error(`unexpected import: ${name}`); } });
  return loaded.exports;
}

const valid = (over = {}) => ({
  title: "Add Three Numbers", description: "Add three integers together.", difficulty: "beginner", category: "Math", inputSpec: "Three integers", outputSpec: "Their sum",
  constraints: "1 <= a\n\n b <= 9", supportedLanguages: ["python", "c", "ruby"], timeLimitMs: "2000", memoryMb: "128",
  testCases: [{ input: "1 2 3", expectedOutput: "6", isHidden: false }, { input: "SECRET-INPUT", expectedOutput: "SECRET-OUTPUT", isHidden: true }], ...over,
});

test("a valid problem is accepted and unknown languages are dropped", () => {
  const checked = checkNewProblem(valid());
  assert.equal(checked.ok, true);
  assert.equal(checked.problem.id, "add-three-numbers");
  assert.deepEqual(checked.problem.supportedLanguages, ["python", "c"]);
  assert.deepEqual(checked.problem.constraints, ["1 <= a", "b <= 9"]);
  assert.equal(checked.problem.memoryLimitKb, 128000);
  assert.equal(slugify("  Hello, World!! "), "hello-world");
});

test("limits stay inside what the sandbox may run, and a problem needs sample and hidden tests", () => {
  assert.ok(checkNewProblem(valid({ timeLimitMs: "60000" })).fieldErrors.timeLimitMs);
  assert.ok(checkNewProblem(valid({ memoryMb: "4000" })).fieldErrors.memoryMb);
  assert.ok(checkNewProblem(valid({ testCases: [{ input: "", expectedOutput: "1", isHidden: false }] })).fieldErrors.testCases);
  assert.ok(checkNewProblem(valid({ testCases: [{ input: "", expectedOutput: "1", isHidden: true }] })).fieldErrors.testCases);
  assert.ok(checkNewProblem(valid({ supportedLanguages: [] })).fieldErrors.supportedLanguages);
});

function store(tables) {
  return load("lib/problems/store.ts", {
    "server-only": {}, "@/lib/db/client": { db: fakeDb(tables), must }, "@/lib/problems/catalog": catalog, "@/lib/workspace-defaults": { ALL_SUPPORTED_LANGUAGES, getStarterCode },
  });
}
const rowFrom = (p) => ({ id: p.id, title: p.title, description: p.description, difficulty: p.difficulty, category: p.category, tags: [], supported_languages: p.supportedLanguages, input_spec: p.inputSpec, output_spec: p.outputSpec, constraints: p.constraints, test_cases: p.testCases, time_limit_ms: p.timeLimitMs, memory_limit_kb: p.memoryLimitKb });

test("hidden tests of a created problem reach the judge but never the browser", async () => {
  const s = store({ problems: [rowFrom(checkNewProblem(valid()).problem)] });
  assert.match(JSON.stringify(await s.findProblem("add-three-numbers")), /SECRET-OUTPUT/);
  const visible = JSON.stringify(await s.findVisibleProblem("add-three-numbers"));
  assert.doesNotMatch(visible, /SECRET/);
  assert.match(visible, /"expectedOutput":"6"/);
  const list = await s.listProblemSummaries();
  assert.doesNotMatch(JSON.stringify(list), /SECRET/);
  assert.ok(list.some((p) => p.id === "add-three-numbers") && list.some((p) => p.id === "hello-world"));
});

function admin(tables) {
  return load("lib/admin/repository.ts", {
    "server-only": {}, "@/lib/dates": { todayInManila: () => "2026-11-09" }, "@/lib/db/client": { db: fakeDb(tables), must }, "@/lib/accounts/rules": { isObject, text }, "@/lib/problems/catalog": catalog, "@/lib/problems/rules": { checkNewProblem },
  });
}
const seeded = () => ({
  problems: [{ id: "keep" }], profiles: [{ user_id: "boss", is_admin: true }, { user_id: "kid", is_admin: false }],
  submissions: [{ user_id: "kid" }], tournament_violations: [{ event_id: "e" }], tournament_teams: [{ event_id: "e" }], friendships: [{ requester: "kid" }], org_applications: [{ org_id: "o" }], school_requests: [{ requested_by: "kid" }],
  events: [{ id: "t", starts_at: "2026-01-01T00:00:00.000Z", ends_at: "2026-01-01T00:30:00.000Z" }, { id: "plain", starts_at: null, ends_at: null }],
});
const dev = { NODE_ENV: "development" };

test("reset clears activity but keeps problems and accounts, and restarts tournaments with their length", async () => {
  const tables = seeded();
  assert.equal((await admin(tables).resetDatabase({ confirm: "RESET" }, dev)).ok, true);
  for (const name of ["submissions", "tournament_violations", "tournament_teams", "friendships", "org_applications", "school_requests"]) assert.equal(tables[name].length, 0, name);
  assert.equal(tables.problems.length, 1);
  assert.equal(tables.profiles.length, 2);
  const [t, plain] = tables.events;
  assert.ok(Date.parse(t.starts_at) > Date.now());
  assert.equal(Date.parse(t.ends_at) - Date.parse(t.starts_at), 30 * 60000);
  assert.equal(plain.starts_at, null);
});

test("deleting accounts always keeps admins", async () => {
  const tables = seeded();
  await admin(tables).resetDatabase({ confirm: "RESET", includeAccounts: true }, dev);
  assert.deepEqual(tables.profiles.map((p) => p.user_id).join(), "boss");
});

test("reset refuses production and a missing confirmation, and deletes nothing", async () => {
  const tables = seeded();
  const repo = admin(tables);
  assert.equal((await repo.resetDatabase({ confirm: "RESET" }, { NODE_ENV: "production" })).status, 403);
  assert.equal((await repo.resetDatabase({ confirm: "reset" }, dev)).status, 400);
  assert.equal(tables.submissions.length, 1);
});

test("the user list joins scores and never includes age", async () => {
  const tables = {
    profiles: [{ user_id: "a", display_name: "Ana", avatar_id: "glitch-bot", border_id: "none", school_email: "a@lspu.edu.ph", school: { campus: "SC", program: "BSCPE" }, is_admin: true, created_at: "2026-11-09", age: 22 }, { user_id: "b", display_name: "Ben", avatar_id: "glitch-bot", border_id: "none", school_email: null, school: null, is_admin: false, created_at: "2026-11-09", age: 30 }],
    leaderboard: [{ user_id: "a", solved: 2, points: 300 }],
  };
  const users = await admin(tables).listUsers();
  assert.deepEqual(users.map((u) => [u.name, u.solved, u.points, u.isAdmin]).join("|"), "Ana,2,300,true|Ben,0,0,false");
  assert.equal(users[0].campus, "SC");
  assert.doesNotMatch(JSON.stringify(users), /"age"/);
});

test("a title that matches a built-in problem is refused", async () => {
  const repo = admin({ problems: [] });
  const result = await repo.createProblem({ id: "boss" }, valid({ title: "Hello World" }));
  assert.equal(result.status, 409);
});
