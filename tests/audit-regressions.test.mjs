import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import vm from "node:vm";
import ts from "typescript";
import { NextResponse } from "next/server";
import { collectArtifacts, runJob } from "../judge/src/runner.ts";
import { validateRunRequest } from "../judge/src/validate.ts";
import { buildLanguageSpecs } from "../judge/src/languages.ts";
import { createJudgeServer } from "../judge/src/app.ts";
import { BoxPool } from "../judge/src/pool.ts";
import { validateExecutionRequest } from "../lib/execution/validation.ts";
import { ExecutionQueue } from "../lib/execution/queue.ts";
import { JudgingService } from "../lib/judge/judging-service.ts";
import { rankTeams } from "../lib/tournaments/standings.ts";
import { isRealVerdict, verdictInfo } from "../lib/verdicts.ts";
import { profileRepository } from "../lib/storage/profile-repository.ts";
import { validateWorkspaceFilename } from "../components/app/workspace/file-tabs.tsx";
import * as orgRules from "../lib/orgs/rules.ts";
import * as adminRules from "../lib/admin/rules.ts";
import * as readJson from "../lib/accounts/read-json.ts";
import * as problemRules from "../lib/problems/rules.ts";
import { isObject, isUuid, text } from "../lib/accounts/rules.ts";
import * as catalog from "../lib/problems/catalog.ts";
import { ALL_SUPPORTED_LANGUAGES, getStarterCode } from "../lib/workspace-defaults.ts";
import { fakeDb, must } from "./fixtures/fake-db.mjs";
import { MockSandboxAdapter } from "./fixtures/mock-adapter.ts";

function loadTs(path, modules, extraGlobals = {}) {
  const source = readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const loaded = { exports: {} };
  vm.runInNewContext(output, {
    module: loaded,
    exports: loaded.exports,
    crypto,
    Date,
    URL,
    console,
    queueMicrotask,
    ...extraGlobals,
    require: (name) => {
      if (name in modules) return modules[name];
      throw Error(`unexpected import: ${name}`);
    },
  });
  return loaded.exports;
}

// ---------------------------------------------------------------------------
// Phase 1: Judge worker & sandbox hardening
// ---------------------------------------------------------------------------

test("judge collectArtifacts and runJob refuse symlinks and FIFOs without hanging or leaking host files", async () => {
  const root = mkdtempSync(join(tmpdir(), "box-sec-"));
  const workDir = mkdtempSync(join(tmpdir(), "work-sec-"));
  const box = join(root, "box");
  try {
    execFileSync("mkdir", ["-p", box]);
    writeFileSync(join(box, "main.bin"), "ok");
    symlinkSync("/etc/passwd", join(box, "leak.txt"));
    execFileSync("mkfifo", [join(box, "hang.fifo")]);

    const artifacts = await collectArtifacts(box);
    assert.deepEqual([...artifacts.keys()], ["main.bin"]);
    assert.equal(artifacts.get("main.bin")?.toString("utf8"), "ok");

    // Verify runJob readCapped refuses symlinked ~stdout and FIFO ~stderr
    const runResult = await runJob(
      { language: "python", files: [{ name: "main.py", content: "pass" }], stdins: [""], timeLimitMs: 1000, memoryLimitKb: 65536 },
      0,
      {
        workDir,
        spec: { mainFile: "main.py", run: () => ["python3", "main.py"], processes: 1, memoryOverheadKb: 0, dirs: [] },
        cli: {
          init: async () => root,
          cleanup: async () => {},
          run: async ({ metaPath }) => {
            writeFileSync(metaPath, "time:0.010\ntime-wall:0.020\ncg-mem:1024\nexitcode:0\n");
            rmSync(join(box, "~stdout"), { force: true });
            rmSync(join(box, "~stderr"), { force: true });
            symlinkSync("/etc/passwd", join(box, "~stdout"));
            execFileSync("mkfifo", [join(box, "~stderr")]);
          },
        },
      }
    );
    assert.equal(runResult.runs[0].status, "SUCCESS");
    assert.equal(runResult.runs[0].stdout, "");
    assert.equal(runResult.runs[0].stderr, "");
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(workDir, { recursive: true, force: true });
  }
});

test("leading-hyphen filenames are rejected across editor, web validation, and judge", () => {
  const files = [{ name: "main.py", content: "x" }, { name: "-flag.py", content: "" }];
  assert.equal(validateExecutionRequest({ language: "python", sourceCode: "x", files }).valid, false);
  assert.equal(validateRunRequest({ language: "python", files, stdins: [""] }, { python: { mainFile: "main.py" } }).ok, false);
  assert.notEqual(validateWorkspaceFilename("-flag.py", "python", [{ name: "main.py", content: "x" }]), null);
});

test("judge compile commands prefix source files with ./ and place -lm at the end of gcc argv", () => {
  const specs = buildLanguageSpecs({ gcc: "/usr/bin/gcc", gxx: "/usr/bin/g++", javac: "/usr/bin/javac", java: "/usr/bin/java", javaDirs: [] });
  const cArgs = specs.c.compile(["main.c", "helper.c"]);
  assert.ok(cArgs.includes("./main.c"));
  assert.ok(cArgs.includes("./helper.c"));
  assert.equal(cArgs.at(-1), "-lm");

  const cppArgs = specs.cpp.compile(["main.cpp"]);
  assert.ok(cppArgs.includes("./main.cpp"));

  const javaArgs = specs.java.compile(["Main.java"]);
  assert.ok(javaArgs.includes("./Main.java"));
});

test("judge server returns JSON 413 cleanly when body exceeds 10 MB", async () => {
  const server = createJudgeServer({
    token: "t".repeat(32),
    specs: {},
    cli: { init: async () => "", run: async () => {}, cleanup: async () => {} },
    pool: new BoxPool(1, 0),
    workDir: tmpdir(),
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const port = server.address().port;
    const huge = "x".repeat(10 * 1024 * 1024 + 256);
    const res = await fetch(`http://127.0.0.1:${port}/v1/run`, {
      method: "POST",
      headers: { authorization: `Bearer ${"t".repeat(32)}`, "content-type": "application/json" },
      body: huge,
    });
    assert.equal(res.status, 413);
    const body = await res.json();
    assert.match(body.error, /too large/i);
  } finally {
    server.close();
  }
});

// ---------------------------------------------------------------------------
// Phase 1: Execution queue & JudgingService
// ---------------------------------------------------------------------------

test("ExecutionQueue releases its slot when a task throws synchronously", async () => {
  const queue = new ExecutionQueue({ maxConcurrent: 1, maxQueueSize: 2 });
  await assert.rejects(
    queue.enqueue(() => {
      throw new Error("sync boom");
    }),
    /sync boom/
  );
  const stats = queue.getStats();
  assert.equal(stats.activeCount, 0);
  const next = await queue.enqueue(async () => "recovered");
  assert.equal(next, "recovered");
});

test("JudgingService returns INTERNAL_JUDGE_ERROR on 0 test cases and chunks >64 tests into batches of <=64", async () => {
  const emptyProblem = {
    id: "empty",
    slug: "empty",
    title: "Empty",
    description: "",
    difficulty: "beginner",
    category: "Test",
    tags: [],
    supportedLanguages: ["python"],
    inputSpec: "",
    outputSpec: "",
    constraints: [],
    sampleTestCases: [],
    testCases: [],
    timeLimitMs: 1000,
    memoryLimitKb: 131072,
    starterCodes: {},
  };
  const service = new JudgingService({ adapter: new MockSandboxAdapter(), queue: new ExecutionQueue() });
  const emptyResult = await service.judgeSubmission(emptyProblem, { language: "python", sourceCode: "print(1)" });
  assert.equal(emptyResult.overallVerdict, "INTERNAL_JUDGE_ERROR");

  const batchSizes = [];
  const batchAdapter = {
    async execute() {
      throw new Error("should use executeBatch");
    },
    async executeBatch(req, stdins) {
      batchSizes.push(stdins.length);
      return stdins.map((s) => ({ status: "SUCCESS", exitCode: 0, stdout: `${s}\n`, stderr: "", durationMs: 1 }));
    },
    async checkHealth() {
      return { isAvailable: true, engine: "test", supportedLanguages: ["python"] };
    },
  };
  const manyTests = Array.from({ length: 130 }, (_, i) => ({
    id: `t${i}`,
    input: String(i),
    expectedOutput: String(i),
    isHidden: i > 0,
  }));
  const batchService = new JudgingService({ adapter: batchAdapter, queue: new ExecutionQueue() });
  const result = await batchService.judgeSubmission(
    { ...emptyProblem, id: "big", testCases: manyTests },
    { language: "python", sourceCode: "print(input())" }
  );
  assert.equal(result.overallVerdict, "ACCEPTED");
  assert.equal(result.passedTests, 130);
  assert.deepEqual(batchSizes, [64, 64, 2]);
});

// ---------------------------------------------------------------------------
// Phase 1: Auth, problem visibility, campus lock, admin limits
// ---------------------------------------------------------------------------

test("problem store hides upcoming tournament problems from students and keeps them visible to admins", async () => {
  const future = new Date(Date.now() + 60 * 60_000).toISOString();
  const past = new Date(Date.now() - 60 * 60_000).toISOString();
  const tables = {
    events: [
      { id: "e1", problem_ids: ["hello-world", "custom-locked"], starts_at: future },
      { id: "e2", problem_ids: ["sum-two-integers"], starts_at: past },
    ],
    problems: [
      {
        id: "custom-locked",
        title: "Locked",
        description: "desc",
        difficulty: "beginner",
        category: "Basics",
        tags: [],
        supported_languages: ["python"],
        input_spec: "in",
        output_spec: "out",
        constraints: [],
        test_cases: [{ id: "1", input: "", expectedOutput: "ok", isHidden: false }],
        time_limit_ms: 1000,
        memory_limit_kb: 131072,
      },
    ],
  };
  const store = loadTs("lib/problems/store.ts", {
    "server-only": {},
    "@/lib/db/client": { db: fakeDb(tables), must },
    "@/lib/problems/catalog": catalog,
    "@/lib/workspace-defaults": { ALL_SUPPORTED_LANGUAGES, getStarterCode },
  });

  assert.equal(await store.findProblem("hello-world"), null);
  assert.equal(await store.findProblem("custom-locked"), null);
  assert.notEqual(await store.findProblem("sum-two-integers"), null);
  assert.notEqual(await store.findProblem("hello-world", { includeLocked: true }), null);
  assert.notEqual(await store.findProblem("custom-locked", { includeLocked: true }), null);

  const studentIds = (await store.listProblemSummaries()).map((p) => p.id);
  assert.ok(!studentIds.includes("hello-world"));
  assert.ok(!studentIds.includes("custom-locked"));
  assert.ok(studentIds.includes("sum-two-integers"));

  const adminIds = (await store.listProblemSummaries(undefined, { includeLocked: true })).map((p) => p.id);
  assert.ok(adminIds.includes("hello-world"));
  assert.ok(adminIds.includes("custom-locked"));
});

test("getOrgDetail masks problems on upcoming or unregistered tournaments", async () => {
  const future = new Date(Date.now() + 60 * 60_000).toISOString();
  const futureEnd = new Date(Date.now() + 120 * 60_000).toISOString();
  const pastStart = new Date(Date.now() - 10 * 60_000).toISOString();
  const ORGS = { acoes: { name: "ACOES", campus_id: "sc", campus_name: "Santa Cruz" } };
  const tables = {
    orgs: [{ id: "acoes", ...ORGS.acoes, school_name: "LSPU", program_name: "BSCPE", org_members: [{ count: 1 }] }],
    org_members: [],
    org_applications: [],
    submissions: [],
    problems: [],
    tournament_members: [{ event_id: "e-live", team_id: "t1", user_id: "joined" }],
    events: [
      { id: "e-upcoming", org_id: "acoes", access: "open", featured: false, title: "Soon", summary: "s", starts_on: "2026-12-01", starts_at: future, ends_at: futureEnd, problem_ids: ["known"], banner: "circuit", winners: null, orgs: ORGS.acoes },
      { id: "e-live", org_id: "acoes", access: "open", featured: false, title: "Live", summary: "s", starts_on: "2026-12-01", starts_at: pastStart, ends_at: futureEnd, problem_ids: ["known"], banner: "circuit", winners: null, orgs: ORGS.acoes },
    ],
  };
  const shared = { "server-only": {}, "@/lib/db/client": { db: fakeDb(tables), must }, "@/lib/dates": { todayInManila: () => "2026-11-08" }, "@/lib/orgs/rules": orgRules };
  const competition = loadTs("lib/competition/repository.ts", {
    ...shared,
    "@/lib/accounts/school-directory": { schoolDirectory: {} },
    "./rank": { rankScores: () => [] },
    "@/lib/judge/solves": { firstSolves: async () => [], solvesBetween: async () => [] },
    "@/lib/problems/catalog": { getProblemById: (id) => (id === "known" ? { id, title: "Known" } : null) },
  });
  const orgRepo = loadTs("lib/orgs/repository.ts", {
    ...shared,
    "@/lib/accounts/rules": { isObject, isUuid, text },
    "@/lib/competition/repository": competition,
    "./rules": orgRules,
  });

  const strangerDetail = await orgRepo.getOrgDetail("acoes", { id: "stranger", name: "Stranger", campusId: "sc" });
  assert.equal(strangerDetail.events.find((e) => e.id === "e-upcoming").problems.length, 0);
  assert.equal(strangerDetail.events.find((e) => e.id === "e-live").problems.length, 0);

  const joinedDetail = await orgRepo.getOrgDetail("acoes", { id: "joined", name: "Joined", campusId: "sc" });
  assert.equal(joinedDetail.events.find((e) => e.id === "e-upcoming").problems.length, 0);
  assert.equal(joinedDetail.events.find((e) => e.id === "e-live").problems.length, 1);
});

test("POST /api/account/school returns 409 when switching an already-set campus", async () => {
  const tables = { profiles: [{ user_id: "u1", campus_id: "sc" }] };
  const route = loadTs("app/api/account/school/route.ts", {
    "next/server": { NextResponse },
    "@/lib/accounts/read-json": readJson,
    "@/lib/accounts/rules": {
      checkSchoolAccount: async () => ({
        ok: true,
        account: { email: "a@lspu.edu.ph", age: 20, school: { kind: "college", schoolId: "lspu", schoolName: "LSPU", campusId: "sp", campusName: "San Pablo" } },
      }),
    },
    "@/lib/accounts/school-directory": { schoolDirectory: {} },
    "@/lib/auth/viewer": { getViewer: async () => ({ id: "u1", name: "Ada", campusId: "sc" }) },
    "@/lib/db/client": { db: fakeDb(tables), must },
  });
  const req = new Request("http://localhost/api/account/school", { method: "POST", body: JSON.stringify({}) });
  const res = await route.POST(req);
  assert.equal(res.status, 409);
  assert.equal(tables.profiles[0].campus_id, "sc");
});

test("POST /api/admin/problems accepts >8 KB payloads and admin events rejects invalid UUIDs", async () => {
  let received = null;
  const route = loadTs("app/api/admin/problems/route.ts", {
    "next/server": { NextResponse },
    "@/lib/accounts/read-json": readJson,
    "@/lib/accounts/rules": { isObject },
    "@/lib/admin/guard": { requireAdmin: async () => ({ viewer: { id: "admin" } }) },
    "@/lib/admin/repository": {
      createProblem: async (_v, body) => { received = body; return { ok: true }; },
      deleteProblem: async () => ({ ok: true }),
      listManagedProblems: async () => [],
    },
    "@/lib/problems/rules": problemRules,
  });
  const bigBody = JSON.stringify({ title: "Big", description: "a".repeat(12_000) });
  const res = await route.POST(new Request("http://localhost/api/admin/problems", { method: "POST", body: bigBody }));
  assert.equal(res.status, 200);
  assert.equal(received.description.length, 12_000);

  const eventsRepo = loadTs("lib/admin/events.ts", {
    "server-only": {},
    "@/lib/accounts/rules": { isObject, isUuid, text },
    "@/lib/db/client": { db: fakeDb({ events: [], problem_sets: [], orgs: [], schools: [] }), must },
    "./rules": adminRules,
    "@/lib/problems/store": { listProblemIds: async () => [], listProblemSummaries: async () => [] },
  });
  const future = new Date(Date.now() + 60 * 60_000).toISOString();
  assert.equal((await eventsRepo.rescheduleEvent({ id: "not-a-uuid", startsAt: future, minutes: 30 })).status, 400);
  assert.equal((await eventsRepo.deleteEvent({ id: "not-a-uuid" })).status, 400);
});

test("requireAdmin denies signed-out callers with 401 and non-admins with 403", async () => {
  const tables = { profiles: [{ user_id: "student", is_admin: false }, { user_id: "boss", is_admin: true }] };
  let currentViewer = null;
  const guard = loadTs("lib/admin/guard.ts", {
    "server-only": {},
    "next/server": { NextResponse },
    "@/lib/auth/viewer": { getViewer: async () => currentViewer },
    "@/lib/db/client": { db: fakeDb(tables), must },
  });

  const anon = await guard.requireAdmin();
  assert.equal(anon.denied.status, 401);

  currentViewer = { id: "student", name: "Student" };
  const student = await guard.requireAdmin();
  assert.equal(student.denied.status, 403);

  currentViewer = { id: "boss", name: "Boss" };
  const admin = await guard.requireAdmin();
  assert.equal(admin.viewer.id, "boss");
});

// ---------------------------------------------------------------------------
// Phase 1: Tournament standings, leave, createTeam cleanup, deleted problem lock
// ---------------------------------------------------------------------------

test("rankTeams compares sub-second ISO timestamps numerically (.500Z is later than Z)", () => {
  const teams = [{ id: "exact", memberIds: ["a"] }, { id: "half", memberIds: ["b"] }];
  const ranked = rankTeams(
    teams,
    [
      { userId: "b", problemId: "p1", points: 100, at: "2026-01-01T00:00:00.500Z" },
      { userId: "a", problemId: "p1", points: 100, at: "2026-01-01T00:00:00Z" },
    ],
    ["p1"]
  );
  assert.deepEqual(ranked.map((t) => [t.teamId, t.rank]), [["exact", 1], ["half", 2]]);
});

test("tournament leave keeps team alive with remaining member, createTeam cleans orphan on 23505, and deleted problems lift lockdown", async () => {
  const ID = "11111111-1111-4111-8111-111111111111";
  const iso = (m) => new Date(Date.now() + m * 60_000).toISOString();
  const org = { name: "O", campus_id: "sc", campus_name: "SC" };
  const makeHarness = (startsIn, endsIn, { failMemberUnique = false, catalogIds = ["p1", "p2"] } = {}) => {
    const tables = {
      events: [{ id: ID, org_id: "o", title: "T", summary: "s", starts_on: "2026-11-09", access: "campus-only", banner: "podium", featured: false, winners: null, problem_ids: ["p1", "p2"], starts_at: iso(startsIn), ends_at: iso(endsIn), team_size: 3, orgs: org }],
      org_members: [],
      problems: [],
      tournament_teams: [{ id: "t1", event_id: ID, name: "Alpha" }],
      tournament_members: [
        { event_id: ID, team_id: "t1", user_id: "a", profiles: { display_name: "a", avatar_id: "glitch-bot", border_id: "none" } },
        { event_id: ID, team_id: "t1", user_id: "b", profiles: { display_name: "b", avatar_id: "glitch-bot", border_id: "none" } },
      ],
      submissions: [],
      tournament_violations: [],
    };
    const rawDb = fakeDb(tables);
    const wrappedDb = () => {
      const client = rawDb();
      return {
        from: (table) => {
          const builder = client.from(table);
          if (failMemberUnique && table === "tournament_members") {
            const origInsert = builder.insert.bind(builder);
            builder.insert = () => Promise.resolve({ data: null, error: { code: "23505", message: "duplicate" } });
            void origInsert;
          }
          return builder;
        },
      };
    };
    const database = { db: wrappedDb, must };
    const solves = loadTs("lib/judge/solves.ts", { "server-only": {}, "@/lib/db/client": database });
    const competition = loadTs("lib/competition/repository.ts", {
      "server-only": {},
      "@/lib/db/client": database,
      "@/lib/dates": { todayInManila: () => "2026-11-09" },
      "@/lib/orgs/rules": orgRules,
      "@/lib/accounts/school-directory": { schoolDirectory: {} },
      "./rank": { rankScores: () => [] },
      "@/lib/judge/solves": solves,
      "@/lib/problems/catalog": { getProblemById: (id) => (catalogIds.includes(id) ? { id, title: id } : null) },
    });
    const repo = loadTs("lib/tournaments/repository.ts", {
      "server-only": {},
      "@/lib/db/client": database,
      "@/lib/accounts/rules": { isObject, isUuid, text },
      "@/lib/competition/repository": competition,
      "@/lib/judge/solves": solves,
      "@/lib/orgs/rules": orgRules,
      "./standings": { rankTeams },
    });
    return { tables, repo };
  };

  // Leave keeps team alive while member 'b' remains, then deletes when last member leaves
  const h1 = makeHarness(5, 30);
  await h1.repo.performTournamentAction({ id: "a", name: "a", campusId: "sc" }, ID, { action: "leave" });
  assert.equal(h1.tables.tournament_teams.length, 1);
  await h1.repo.performTournamentAction({ id: "b", name: "b", campusId: "sc" }, ID, { action: "leave" });
  assert.equal(h1.tables.tournament_teams.length, 0);

  // createTeam cleans up orphan team if member insert hits 23505
  const h2 = makeHarness(5, 30, { failMemberUnique: true });
  const res = await h2.repo.performTournamentAction({ id: "c", name: "c", campusId: "sc" }, ID, { action: "createTeam", name: "Beta" });
  assert.equal(res.status, 409);
  assert.equal(h2.tables.tournament_teams.length, 1, "orphan Beta team should be deleted");

  // Deleted problem ("p2" missing from catalog) does not trap team in lockdown once "p1" is solved
  const h3 = makeHarness(-5, 30, { catalogIds: ["p1"] });
  h3.tables.submissions.push({ user_id: "a", problem_id: "p1", verdict: "ACCEPTED", points: 100, created_at: iso(-1) });
  assert.equal(await h3.repo.getActiveTournament({ id: "a", name: "a", campusId: "sc" }), null);
});

// ---------------------------------------------------------------------------
// Phase 2: Verdicts prototype safety, profile fields, workspace flush, deadline
// ---------------------------------------------------------------------------

test("isRealVerdict and verdictInfo reject Object.prototype properties", () => {
  assert.equal(isRealVerdict("toString"), false);
  assert.equal(isRealVerdict("constructor"), false);
  assert.equal(verdictInfo("toString").code, "ERR");
  assert.equal(verdictInfo("hasOwnProperty").label, "Unknown result");
});

test("profileRepository.saveProfile preserves socialLinks, userType, and borderId", async () => {
  await profileRepository.clearAll();
  const saved = await profileRepository.saveProfile({
    displayName: "Ada",
    avatarId: "glitch-bot",
    experienceLevel: "advanced",
    preferredLanguage: "python",
    userType: "student",
    borderId: "amber-circuit",
    socialLinks: { github: "https://github.com/ada" },
  });
  assert.equal(saved.userType, "student");
  assert.equal(saved.borderId, "amber-circuit");
  assert.deepEqual(saved.socialLinks, { github: "https://github.com/ada" });
  const loaded = await profileRepository.getActiveProfile();
  assert.equal(loaded?.borderId, "amber-circuit");
  assert.deepEqual(loaded?.socialLinks, { github: "https://github.com/ada" });
  await profileRepository.clearAll();
});

test("useWorkspaceFiles flushes pending save to the previous problem before switching problems", async () => {
  const slots = [];
  let index = 0;
  const effects = [];
  let effectIndex = 0;
  const react = {
    useState: (initial) => { const slot = index++; if (!(slot in slots)) slots[slot] = initial; return [slots[slot], (v) => { slots[slot] = typeof v === "function" ? v(slots[slot]) : v; }]; },
    useRef: (initial) => { const slot = index++; if (!(slot in slots)) slots[slot] = { current: initial }; return slots[slot]; },
    useCallback: (fn, deps) => { const slot = index++; if (slots[slot]?.deps.every((d, i) => d === deps[i])) return slots[slot].fn; slots[slot] = { fn, deps }; return fn; },
    useEffect: (run, deps) => { const slot = effectIndex++; const prev = effects[slot]; if (!prev || deps.some((d, i) => d !== prev.deps[i])) { prev?.cleanup?.(); effects[slot] = { deps, cleanup: run() }; } },
  };
  const saves = [];
  const doc = { visibilityState: "visible", addEventListener() {}, removeEventListener() {} };
  const mod = loadTs("hooks/use-workspace-files.ts", {
    react,
    "@/lib/storage/draft-repository": { draftRepository: { getDraft: async () => null, saveDraft: async (_uid, lang, code, _files, pid) => { saves.push({ pid, lang, code }); } } },
    "@/lib/storage/coding-activity": { recordCodingDay: () => true },
    "@/lib/workspace-defaults": { getFilenameForLanguage: () => "main.py", getStarterCode: () => "starter" },
  }, { window: doc, document: doc, setTimeout: () => 1, clearTimeout() {} });

  const render = (problemId) => {
    index = 0;
    effectIndex = 0;
    return mod.useWorkspaceFiles(
      { id: "u1", preferredLanguage: "python" },
      { id: problemId, supportedLanguages: ["python"], starterCodes: { python: "starter" } },
      problemId
    );
  };
  const settle = () => new Promise((r) => setImmediate(r));

  const first = render("prob-a");
  await settle();
  first.setFileContent("main.py", "unsaved for prob-a");
  assert.equal(saves.length, 0);

  render("prob-b");
  await settle();
  assert.deepEqual(saves, [{ pid: "prob-a", lang: "python", code: "unsaved for prob-a" }]);
});

test("ChallengeProvider refuses finishChallenge() after deadline even while state is still active", () => {
  const KEY = "challenge";
  let now = 10_000;
  const saved = { id: "c1", problemId: "p", problemTitle: "P", durationMs: 5_000, startedAt: 10_000, deadline: 15_000, status: "active", submissionCount: 1, lastVerdict: null };
  const store = new Map([[KEY, JSON.stringify(saved)]]);
  const slots = [];
  let index = 0;
  const react = {
    createContext: () => ({ Provider: "Provider" }),
    useContext: () => null,
    useState: (initial) => { const slot = index++; if (!(slot in slots)) slots[slot] = initial; return [slots[slot], (v) => { slots[slot] = typeof v === "function" ? v(slots[slot]) : v; }]; },
    useRef: (initial) => { const slot = index++; if (!(slot in slots)) slots[slot] = { current: initial }; return slots[slot]; },
    useEffect: (run) => { run(); },
    useCallback: (fn) => fn,
    useMemo: (fn) => fn(),
  };
  const FakeDate = { now: () => now };
  const mod = loadTs("hooks/use-challenge-session.tsx", {
    react,
    "react/jsx-runtime": { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    "next/navigation": { useRouter: () => ({ push() {} }) },
    "@/types/challenge": { DEFAULT_CHALLENGE_DURATION_MS: 5_000, CHALLENGE_STORAGE_KEY: KEY },
  }, {
    Date: FakeDate,
    window: { addEventListener() {}, removeEventListener() {} },
    document: { visibilityState: "visible", addEventListener() {}, removeEventListener() {} },
    localStorage: { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: (k) => store.delete(k) },
    setInterval: () => 1,
    clearInterval() {},
  });

  const ctx = mod.ChallengeProvider({ children: null }).props.value;
  // Advance wall clock past deadline without re-rendering
  now = 20_000;
  assert.equal(ctx.finishChallenge(), false);
  assert.equal(JSON.parse(store.get(KEY)).status, "expired");
});

test("schoolDirectory filters locations, schools, and exact or subdomain email domains per query", async () => {
  const tables = {
    schools: [
      { id: "lspu", name: "Laguna State Polytechnic University", short_name: "LSPU", location_id: "laguna", location_name: "Laguna", email_domains: ["lspu.edu.ph"], programs: [], campuses: [{ id: "sc", name: "Santa Cruz" }] },
      { id: "up", name: "University of the Philippines", short_name: "UP", location_id: "manila", location_name: "Manila", email_domains: ["up.edu.ph"], programs: [], campuses: [] },
    ],
  };
  const accountRules = await import("../lib/accounts/rules.ts");
  const { schoolDirectory } = loadTs("lib/accounts/school-directory.ts", {
    "server-only": {},
    "@/lib/db/client": { db: fakeDb(tables), must },
    "./rules": accountRules,
  });

  assert.equal(JSON.stringify(await schoolDirectory.listLocations()), JSON.stringify([{ id: "laguna", name: "Laguna" }, { id: "manila", name: "Manila" }]));
  assert.deepEqual((await schoolDirectory.listSchools("laguna")).map((s) => s.id), ["lspu"]);
  assert.equal((await schoolDirectory.findSchool("up"))?.shortName, "UP");
  assert.equal(await schoolDirectory.findSchool("missing"), null);
  assert.equal((await schoolDirectory.findSchoolByDomain("lspu.edu.ph"))?.id, "lspu");
  assert.equal((await schoolDirectory.findSchoolByDomain("student.sc.lspu.edu.ph"))?.id, "lspu");
  assert.equal(await schoolDirectory.findSchoolByDomain("unknown.edu.ph"), null);
});

test("listUsers paginates past 500 accounts and joins leaderboard scores across batches", async () => {
  const profiles = Array.from({ length: 520 }, (_, i) => ({
    user_id: `u${i}`,
    display_name: `Student ${i}`,
    avatar_id: "glitch-bot",
    border_id: "none",
    school_email: null,
    school: null,
    is_admin: i === 0,
    created_at: "2026-11-19",
  }));
  const leaderboard = [{ user_id: "u519", solved: 4, points: 450 }];
  const repo = loadTs("lib/admin/repository.ts", {
    "server-only": {},
    "@/lib/dates": { todayInManila: () => "2026-11-19" },
    "@/lib/db/client": { db: fakeDb({ profiles, leaderboard }), must },
    "@/lib/accounts/rules": { isObject, text },
    "@/lib/problems/catalog": catalog,
    "@/lib/problems/rules": problemRules,
  });

  const users = await repo.listUsers();
  assert.equal(users.length, 520);
  const last = users.find((u) => u.id === "u519");
  assert.equal(last?.solved, 4);
  assert.equal(last?.points, 450);
});

test("3D scroll tour keeps render loop alive across sticky scroll containers and updates score bidirectionally", () => {
  const stageSource = readFileSync(new URL("../lib/three/stage.ts", import.meta.url), "utf8");
  assert.match(stageSource, /frame = requestAnimationFrame\(loop\)/);
  assert.match(stageSource, /mount\.getBoundingClientRect\(\)/);
  assert.match(stageSource, /entries\[entries\.length - 1\]/);
  assert.doesNotMatch(stageSource, /if \(!running && visible && !disposed\)/);

  const arenaSource = readFileSync(new URL("../lib/three/arena.ts", import.meta.url), "utf8");
  assert.match(arenaSource, /else if \(!win && wasWin && score\.you === 10\)/);

  const tourSource = readFileSync(new URL("../components/landing/podium-tour.tsx", import.meta.url), "utf8");
  assert.match(tourSource, /aria-hidden=\{i !== step \|\| undefined\}/);
  assert.match(tourSource, /tabIndex=\{i === step \? undefined : -1\}/);
  assert.doesNotMatch(tourSource, /inert=\{i !== step\}/);
});


