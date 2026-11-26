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
import * as readJson from "../lib/accounts/read-json.ts";
import { isObject, isUuid, text } from "../lib/accounts/rules.ts";
import * as catalog from "./fixtures/sample-problems.ts";
import { ALL_SUPPORTED_LANGUAGES, getStarterCode } from "../lib/workspace-defaults.ts";
import { exactCount, fakeDb, fetchAllPages, must } from "./fixtures/fake-db.mjs";
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
      if (name === "@/lib/cache/public-cache") return { getOrLoadPublic: (_k, _t, fn) => fn(), invalidatePublicCache: () => {} };
      if (name === "@/lib/competition/repository") return { invalidateLeaderboardCache: () => {} };
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
  const queue = new ExecutionQueue({ maxConcurrency: 1, maxQueueLength: 2 });
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

test("problem store hides upcoming and unregistered live tournament problems from students and keeps them visible to participants and admins", async () => {
  const future = new Date(Date.now() + 60 * 60_000).toISOString();
  const futureEnd = new Date(Date.now() + 120 * 60_000).toISOString();
  const pastStart = new Date(Date.now() - 15 * 60_000).toISOString();
  const pastEnd = new Date(Date.now() - 5 * 60_000).toISOString();
  const tables = {
    events: [
      { id: "e1", problem_ids: ["hello-world", "custom-locked"], starts_at: future, ends_at: futureEnd },
      { id: "e-live", problem_ids: ["even-or-odd"], starts_at: pastStart, ends_at: futureEnd },
      { id: "e2", problem_ids: ["sum-two-integers"], starts_at: pastStart, ends_at: pastEnd },
    ],
    tournament_members: [
      { event_id: "e-live", team_id: "t1", user_id: "joined" },
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
      {
        id: "cls-teacher-quiz-123456",
        title: "Teacher Quiz",
        description: "desc",
        difficulty: "beginner",
        category: "Class Exercise",
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
    "@/lib/db/client": { db: fakeDb(tables), exactCount, fetchAllPages, must },
    "@/lib/problems/catalog": catalog,
    "@/lib/workspace-defaults": { ALL_SUPPORTED_LANGUAGES, getStarterCode },
  });

  // Upcoming tournament problems are hidden from everyone except admins (includeLocked).
  assert.equal(await store.findProblem("hello-world", { userId: "stranger" }), null);
  assert.equal(await store.findProblem("custom-locked", { userId: "joined" }), null);
  // Live tournament problem is hidden from unregistered students, visible to registered participants.
  assert.equal(await store.findProblem("even-or-odd", { userId: "stranger" }), null);
  assert.notEqual(await store.findProblem("even-or-odd", { userId: "joined" }), null);
  // Ended tournament problem is visible to everyone.
  assert.notEqual(await store.findProblem("sum-two-integers", { userId: "stranger" }), null);
  assert.notEqual(await store.findProblem("hello-world", { includeLocked: true }), null);
  assert.notEqual(await store.findProblem("custom-locked", { includeLocked: true }), null);

  const strangerIds = (await store.listProblemSummaries(undefined, { userId: "stranger" })).map((p) => p.id);
  assert.ok(!strangerIds.includes("hello-world"));
  assert.ok(!strangerIds.includes("custom-locked"));
  assert.ok(!strangerIds.includes("even-or-odd"));
  assert.ok(!strangerIds.includes("cls-teacher-quiz-123456"));
  assert.ok(strangerIds.includes("sum-two-integers"));

  const withClassProblems = (await store.listProblemSummaries(undefined, { userId: "stranger", includeClassProblems: true })).map((p) => p.id);
  assert.ok(withClassProblems.includes("cls-teacher-quiz-123456"));

  const joinedIds = (await store.listProblemSummaries(undefined, { userId: "joined" })).map((p) => p.id);
  assert.ok(joinedIds.includes("even-or-odd"));
  assert.ok(!joinedIds.includes("hello-world"));

  const adminIds = (await store.listProblemSummaries(undefined, { includeLocked: true })).map((p) => p.id);
  assert.ok(adminIds.includes("hello-world"));
  assert.ok(adminIds.includes("custom-locked"));
  assert.ok(adminIds.includes("even-or-odd"));
  assert.ok(!adminIds.includes("cls-teacher-quiz-123456"));
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
  const shared = { "server-only": {}, "@/lib/db/client": { db: fakeDb(tables), exactCount, fetchAllPages, must }, "@/lib/dates": { todayInManila: () => "2026-11-08" }, "@/lib/orgs/rules": orgRules };
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
    "@/lib/notifications/repository": { notifyUsers: async () => {} },
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
    "@clerk/nextjs/server": { currentUser: async () => ({ emailAddresses: [] }) },
    "@/lib/accounts/read-json": readJson,
    "@/lib/accounts/rules": {
      checkSchoolAccount: async () => ({
        ok: true,
        account: { email: "a@lspu.edu.ph", age: 20, school: { kind: "college", schoolId: "lspu", schoolName: "LSPU", campusId: "sp", campusName: "San Pablo" } },
      }),
    },
    "@/lib/accounts/school-directory": { schoolDirectory: {} },
    "@/lib/api/route-handler": { withApiErrors: (_label, fn) => fn() },
    "@/lib/auth/viewer": { getViewer: async () => ({ id: "u1", name: "Ada", campusId: "sc" }) },
    "@/lib/db/client": { db: fakeDb(tables), exactCount, fetchAllPages, must },
  });
  const req = new Request("http://localhost/api/account/school", { method: "POST", body: JSON.stringify({}) });
  const res = await route.POST(req);
  assert.equal(res.status, 409);
  assert.equal(tables.profiles[0].campus_id, "sc");
});

test("POST /api/account/school requires Clerk OTP verification, allows same email on same account, and blocks another account", async () => {
  const tables = {
    profiles: [
      { user_id: "u1", campus_id: null, school_email: null, age: null, school: null },
      { user_id: "u2", campus_id: "sc", school_email: "taken@lspu.edu.ph", age: 21, school: null },
    ],
  };
  let clerkEmails = [];
  let requestedEmail = "student@lspu.edu.ph";
  let requestedAge = 20;
  let viewerCampusId = undefined;

  const route = loadTs("app/api/account/school/route.ts", {
    "next/server": { NextResponse },
    "@clerk/nextjs/server": { currentUser: async () => ({ emailAddresses: clerkEmails }) },
    "@/lib/accounts/read-json": readJson,
    "@/lib/accounts/rules": {
      checkSchoolAccount: async () => ({
        ok: true,
        account: { email: requestedEmail, age: requestedAge, school: { id: "lspu", campusId: "sc", name: "LSPU", shortName: "LSPU", location: "Laguna", campus: "Santa Cruz", status: "listed" } },
      }),
    },
    "@/lib/accounts/school-directory": { schoolDirectory: {} },
    "@/lib/api/route-handler": { withApiErrors: (_label, fn) => fn() },
    "@/lib/auth/viewer": { getViewer: async () => ({ id: "u1", name: "Ada", campusId: viewerCampusId }) },
    "@/lib/db/client": { db: fakeDb(tables), exactCount, fetchAllPages, must },
  });

  const post = () => route.POST(new Request("http://localhost/api/account/school", { method: "POST", body: JSON.stringify({}) }));

  // 1. Unverified email returns 403 VERIFICATION_REQUIRED and does not mutate profile.
  clerkEmails = [{ emailAddress: "student@lspu.edu.ph", verification: { status: "unverified" } }];
  const unverifiedRes = await post();
  assert.equal(unverifiedRes.status, 403);
  const unverifiedBody = await unverifiedRes.json();
  assert.equal(unverifiedBody.code, "VERIFICATION_REQUIRED");
  assert.equal(tables.profiles[0].school_email, null);

  // 2. Once Clerk verifies the email on this account, saving succeeds and sets verified: true.
  clerkEmails = [{ emailAddress: "STUDENT@LSPU.EDU.PH", verification: { status: "verified" } }];
  const okRes = await post();
  assert.equal(okRes.status, 200);
  const okBody = await okRes.json();
  assert.equal(okBody.account.verified, true);
  assert.equal(tables.profiles[0].school_email, "student@lspu.edu.ph");

  // 3. Re-saving with the SAME student email on the SAME account works (e.g. updating age).
  viewerCampusId = "sc";
  requestedAge = 21;
  const sameAccountRes = await post();
  assert.equal(sameAccountRes.status, 200);
  assert.equal(tables.profiles[0].age, 21);

  // 4. Attempting to claim a student email linked to ANOTHER account returns 409.
  requestedEmail = "taken@lspu.edu.ph";
  clerkEmails = [{ emailAddress: "taken@lspu.edu.ph", verification: { status: "verified" } }];
  const conflictRes = await post();
  assert.equal(conflictRes.status, 409);
  assert.equal(tables.profiles[0].school_email, "student@lspu.edu.ph");
});

test("clerk-email helper reuses verified and unverified emails on the same account without duplicate createEmailAddress calls", async () => {
  const { prepareClerkEmailOtp, verifyClerkEmailOtp } = await import("../lib/auth/clerk-email.ts");

  // 1. Existing verified email on same account -> returns already_verified, never calls createEmailAddress or prepareVerification.
  let createCalls = 0;
  let prepareCalls = 0;
  const verifiedUser = {
    emailAddresses: [
      {
        id: "em_1",
        emailAddress: "Student@LSPU.edu.ph",
        verification: { status: "verified" },
        prepareVerification: async () => { prepareCalls++; },
        attemptVerification: async () => ({ verification: { status: "verified" } }),
      },
    ],
    createEmailAddress: async () => { createCalls++; throw new Error("should not create"); },
    reload: async () => verifiedUser,
  };
  const r1 = await prepareClerkEmailOtp(verifiedUser, "student@lspu.edu.ph");
  assert.deepEqual(r1, { status: "already_verified", emailId: "em_1" });
  assert.equal(createCalls, 0);
  assert.equal(prepareCalls, 0);

  // 2. Existing unverified email on same account -> reuses it (no createEmailAddress) and prepares OTP.
  let verifyAttempts = 0;
  let reloadCalls = 0;
  const unverifiedEmail = {
    id: "em_2",
    emailAddress: "retry@lspu.edu.ph",
    verification: { status: "unverified" },
    prepareVerification: async () => { prepareCalls++; },
    attemptVerification: async ({ code }) => {
      verifyAttempts++;
      if (code === "123456") {
        unverifiedEmail.verification = { status: "verified" };
      }
      return unverifiedEmail;
    },
  };
  const retryUser = {
    emailAddresses: [unverifiedEmail],
    createEmailAddress: async () => { createCalls++; throw new Error("should not create"); },
    reload: async () => { reloadCalls++; return retryUser; },
  };
  const r2 = await prepareClerkEmailOtp(retryUser, "retry@lspu.edu.ph");
  assert.deepEqual(r2, { status: "otp_sent", emailId: "em_2" });
  assert.equal(createCalls, 0);
  assert.equal(prepareCalls, 1);

  const v1 = await verifyClerkEmailOtp(retryUser, "em_2", "retry@lspu.edu.ph", "123456");
  assert.deepEqual(v1, { ok: true });
  assert.equal(verifyAttempts, 1);
  assert.ok(reloadCalls >= 2);
});

test("isAdmin recognizes both is_admin flag and role='admin' and rejects students/teachers", async () => {
  const tables = {
    profiles: [
      { user_id: "student", is_admin: false, role: "student" },
      { user_id: "teacher", is_admin: false, role: "teacher" },
      { user_id: "boss-flag", is_admin: true, role: "student" },
      { user_id: "boss-role", is_admin: false, role: "admin" },
    ],
  };
  const check = loadTs("lib/auth/admin-check.ts", {
    "server-only": {},
    "@/lib/db/client": { db: fakeDb(tables), exactCount, fetchAllPages, must },
  });

  assert.equal(await check.isAdmin("student"), false);
  assert.equal(await check.isAdmin("teacher"), false);
  assert.equal(await check.isAdmin("boss-flag"), true);
  assert.equal(await check.isAdmin("boss-role"), true);
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

test("tournament leave delegates empty-team cleanup to SQL trigger, createTeam cleans orphan on 23505, and deleted problems lift lockdown", async () => {
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
    const database = { db: wrappedDb, exactCount, fetchAllPages, must };
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

  // Leave removes only the member row in JS; Postgres trigger atomically removes empty teams.
  const h1 = makeHarness(5, 30);
  await h1.repo.performTournamentAction({ id: "a", name: "a", campusId: "sc" }, ID, { action: "leave" });
  assert.equal(h1.tables.tournament_members.length, 1);
  assert.equal(h1.tables.tournament_teams.length, 1);
  await h1.repo.performTournamentAction({ id: "b", name: "b", campusId: "sc" }, ID, { action: "leave" });
  assert.equal(h1.tables.tournament_members.length, 0);
  const triggerSql = readFileSync(new URL("../supabase/migrations/20261120020000_tournament_team_cleanup_trigger.sql", import.meta.url), "utf8");
  assert.match(triggerSql, /FOR UPDATE/i);
  assert.match(triggerSql, /NOT EXISTS/i);
  assert.match(triggerSql, /AFTER DELETE ON (public\.)?tournament_members/i);

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
  const second = render("prob-b");
  assert.equal(second.code, "starter");
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
    "@/lib/db/client": { db: fakeDb(tables), exactCount, fetchAllPages, must },
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

test("landing page uses skeuomorphic sandbox deck with keyboard tab navigation and progressive scroll reveal", () => {
  const terminalSource = readFileSync(new URL("../components/landing/pixel-terminal.tsx", import.meta.url), "utf8");
  assert.match(terminalSource, /skeuo-panel/);
  assert.match(terminalSource, /skeuo-recess/);
  assert.match(terminalSource, /skeuo-well/);
  assert.match(terminalSource, /skeuo-switch/);
  assert.match(terminalSource, /const LANGUAGE_ORDER: LanguageKey\[\] = \["python", "java", "cpp", "c"\]/);
  assert.match(terminalSource, /event\.key === "ArrowRight"/);
  assert.match(terminalSource, /aria-live="polite"/);
  assert.match(terminalSource, /min-h-\[19rem\]/);
  assert.match(terminalSource, /min-h-\[144px\]/);
  assert.doesNotMatch(terminalSource, /animate-terminal-blink/);

  const practiceSource = readFileSync(new URL("../components/landing/practice.tsx", import.meta.url), "utf8");
  assert.match(practiceSource, /lg:items-start/);

  const revealSource = readFileSync(new URL("../components/landing/scroll-reveal.tsx", import.meta.url), "utf8");
  assert.match(revealSource, /effectiveReducedMotion/);
  assert.match(revealSource, /data-reveal=\{revealAttr\}/);

  for (const file of [
    "../components/landing/hero.tsx",
    "../components/landing/practice.tsx",
    "../components/landing/about.tsx",
    "../components/landing/languages.tsx",
    "../components/landing/faq.tsx",
  ]) {
    const src = readFileSync(new URL(file, import.meta.url), "utf8");
    assert.match(src, /ScrollReveal/);
    assert.match(src, /skeuo-panel/);
  }
});

// ---------------------------------------------------------------------------
// Audit Wave 1-3 Regressions: fail-closed judging, isolate recovery, runner caps,
// school request status handling, and strict lowercase extension / time limit
// ---------------------------------------------------------------------------

test("JudgingService fails closed on partial batch results and short-circuits chunks on INTERNAL_ERROR without leaking raw errors", async () => {
  const problem = {
    id: "p-partial",
    title: "Partial",
    description: "",
    difficulty: "beginner",
    category: "Basics",
    tags: [],
    supportedLanguages: ["python"],
    inputSpec: "",
    outputSpec: "",
    constraints: [],
    testCases: [
      { id: "t1", input: "1", expectedOutput: "1", isHidden: false },
      { id: "t2", input: "2", expectedOutput: "2", isHidden: true },
    ],
    timeLimitMs: 1000,
    memoryLimitKb: 131072,
    starterCodes: {},
  };

  // Adapter returns fewer results than requested -> must NOT accept.
  const partialAdapter = {
    async execute() { throw new Error("unexpected"); },
    async executeBatch() {
      return [{ status: "SUCCESS", exitCode: 0, stdout: "1\n", stderr: "", durationMs: 1 }];
    },
    async checkHealth() { return { isAvailable: true, engine: "test", supportedLanguages: ["python"] }; },
  };
  const partialService = new JudgingService({ adapter: partialAdapter, queue: new ExecutionQueue() });
  const partialRes = await partialService.judgeSubmission(problem, { language: "python", sourceCode: "print(1)" });
  assert.equal(partialRes.overallVerdict, "INTERNAL_JUDGE_ERROR");
  assert.equal(partialRes.passedTests, 0);

  // Adapter returns INTERNAL_ERROR on chunk 1 -> chunk 2 is never called and raw internal message is redacted.
  let batchCalls = 0;
  const errAdapter = {
    async execute() { throw new Error("unexpected"); },
    async executeBatch(_req, stdins) {
      batchCalls++;
      return stdins.map(() => ({ status: "INTERNAL_ERROR", exitCode: null, stdout: "", stderr: "", durationMs: 0, error: "http://10.0.0.5:4000 secret token" }));
    },
    async checkHealth() { return { isAvailable: true, engine: "test", supportedLanguages: ["python"] }; },
  };
  const manyTests = Array.from({ length: 70 }, (_, i) => ({ id: `t${i}`, input: "1", expectedOutput: "1", isHidden: true }));
  const errService = new JudgingService({ adapter: errAdapter, queue: new ExecutionQueue() });
  const errRes = await errService.judgeSubmission({ ...problem, testCases: manyTests }, { language: "python", sourceCode: "print(1)" });
  assert.equal(errRes.overallVerdict, "INTERNAL_JUDGE_ERROR");
  assert.equal(batchCalls, 1);
  assert.doesNotMatch(errRes.error ?? "", /10\.0\.0\.5|secret token/);
});

test("createIsolateCli.init runs --cleanup and retries --init once after a stale box failure", async () => {
  const calls = [];
  let initAttempts = 0;
  const { createIsolateCli } = loadTs("judge/src/isolate.ts", {
    "node:child_process": {
      execFile: (_bin, args, _opts, cb) => {
        calls.push(args.join(" "));
        if (args.includes("--init")) {
          initAttempts++;
          if (initAttempts === 1) return cb({ code: 1 }, "", "Box already exists");
          return cb(null, "/var/local/lib/isolate/3\n", "");
        }
        return cb(null, "", "");
      },
    },
  });
  const cli = createIsolateCli("isolate");
  const root = await cli.init(3);
  assert.equal(root, "/var/local/lib/isolate/3");
  assert.deepEqual(calls, [
    "--cg --box-id=3 --init",
    "--cg --box-id=3 --cleanup",
    "--cg --box-id=3 --init",
  ]);
});

test("judge runJob reports compile failure for oversized artifacts and stops batches past maxBatchWallMs", async () => {
  const root = mkdtempSync(join(tmpdir(), "box-cap-"));
  const workDir = mkdtempSync(join(tmpdir(), "work-cap-"));
  const box = join(root, "box");
  try {
    const specs = buildLanguageSpecs({ python3: "/usr/bin/python3", gcc: "/usr/bin/gcc", gxx: "/usr/bin/g++", javac: "/usr/bin/javac", java: "/usr/bin/java", javaDirs: [] });
    const oversizedCli = {
      async init() {
        const { mkdirSync } = await import("node:fs");
        mkdirSync(box, { recursive: true });
        return root;
      },
      async run(r) {
        writeFileSync(r.metaPath, "exitcode:0\ntime:0.01\ntime-wall:0.02\n");
        writeFileSync(join(box, r.stdout), "");
        writeFileSync(join(box, "solution"), Buffer.alloc(17 * 1024 * 1024));
      },
      async cleanup() {},
    };
    const bigRes = await runJob(
      { language: "cpp", files: [{ name: "main.cpp", content: "int main(){}" }], stdins: [""], timeLimitMs: 1000, memoryLimitKb: 131072 },
      0,
      { cli: oversizedCli, spec: specs.cpp, workDir }
    );
    assert.equal(bigRes.compile?.ok, false);
    assert.match(bigRes.compile?.output ?? "", /too large/i);
    assert.deepEqual(bigRes.runs, []);

    // Batch wall-time cap short-circuits subsequent test cases instead of running them all.
    let runInvocations = 0;
    const slowCli = {
      async init() {
        const { mkdirSync } = await import("node:fs");
        mkdirSync(box, { recursive: true });
        return root;
      },
      async run(r) {
        runInvocations++;
        await new Promise((resolve) => setTimeout(resolve, 25));
        writeFileSync(r.metaPath, "exitcode:0\ntime:0.01\ntime-wall:0.02\n");
        writeFileSync(join(box, r.stdout), "ok\n");
        if (r.stderr) writeFileSync(join(box, r.stderr), "");
      },
      async cleanup() {},
    };
    const cappedRes = await runJob(
      { language: "python", files: [{ name: "main.py", content: "print('ok')" }], stdins: ["1", "2", "3"], timeLimitMs: 1000, memoryLimitKb: 131072 },
      0,
      { cli: slowCli, spec: specs.python, workDir, maxBatchWallMs: 10 }
    );
    assert.equal(runInvocations, 1);
    assert.equal(cappedRes.runs.length, 3);
    assert.equal(cappedRes.runs[0].status, "SUCCESS");
    assert.equal(cappedRes.runs[1].status, "INTERNAL_ERROR");
    assert.equal(cappedRes.runs[2].status, "INTERNAL_ERROR");

    // Oversized stdout past 256 KB is flagged as Output limit exceeded, never silently truncated into a false verdict.
    const loudCli = {
      async init() {
        const { mkdirSync } = await import("node:fs");
        mkdirSync(box, { recursive: true });
        return root;
      },
      async run(r) {
        writeFileSync(r.metaPath, "exitcode:0\ntime:0.01\ntime-wall:0.02\n");
        writeFileSync(join(box, r.stdout), "A".repeat(256 * 1024 + 5));
        if (r.stderr) writeFileSync(join(box, r.stderr), "");
      },
      async cleanup() {},
    };
    const loudRes = await runJob(
      { language: "python", files: [{ name: "main.py", content: "print('A')" }], stdins: [""], timeLimitMs: 1000, memoryLimitKb: 131072 },
      0,
      { cli: loudCli, spec: specs.python, workDir }
    );
    assert.equal(loudRes.runs[0].status, "RUNTIME_ERROR");
    assert.match(loudRes.runs[0].message ?? "", /Output limit exceeded/);
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(workDir, { recursive: true, force: true });
  }
});

test("POST /api/schools returns 409 for pending/approved requests and resets status to pending after rejection", async () => {
  const tables = {
    school_requests: [
      { id: "r1", requested_by: "u1", email_domain: "pending.edu.ph", status: "pending", name: "Pending U", location: "Laguna", campus: null },
      { id: "r2", requested_by: "u1", email_domain: "approved.edu.ph", status: "approved", name: "Approved U", location: "Laguna", campus: null },
      { id: "r3", requested_by: "u1", email_domain: "retry.edu.ph", status: "rejected", name: "Retry U", location: "Laguna", campus: null },
    ],
  };
  const route = loadTs("app/api/schools/route.ts", {
    "next/server": { NextResponse },
    "@clerk/nextjs/server": { auth: async () => ({ userId: "u1" }) },
    "@/lib/accounts/read-json": readJson,
    "@/lib/accounts/rules": {
      checkNewSchool: async (body) => ({
        ok: true,
        school: { name: "School", location: "Laguna", campus: null, emailDomain: body.emailDomain },
      }),
    },
    "@/lib/accounts/school-directory": { schoolDirectory: {} },
    "@/lib/api/route-handler": { withApiErrors: (_label, fn) => fn() },
    "@/lib/auth/viewer": { getViewer: async () => ({ id: "u1", name: "Ada" }) },
    "@/lib/db/client": { db: fakeDb(tables), exactCount, fetchAllPages, must },
  });

  const post = (emailDomain) =>
    route.POST(new Request("http://localhost/api/schools", { method: "POST", body: JSON.stringify({ emailDomain }) }));

  assert.equal((await post("pending.edu.ph")).status, 409);
  assert.equal((await post("approved.edu.ph")).status, 409);
  const retried = await post("retry.edu.ph");
  assert.equal(retried.status, 202);
  assert.equal(tables.school_requests.find((r) => r.email_domain === "retry.edu.ph").status, "pending");
});

test("validateExecutionRequest and validateWorkspaceFilename reject uppercase extensions and cap timeLimitMs at 5000ms", () => {
  const upperCpp = validateExecutionRequest({
    language: "cpp",
    sourceCode: "int main(){}",
    files: [{ name: "Main.CPP", content: "int main(){}" }],
  });
  assert.equal(upperCpp.valid, false);

  const upperJava = validateExecutionRequest({
    language: "java",
    sourceCode: "class Main {}",
    files: [{ name: "Main.JAVA", content: "class Main {}" }],
  });
  assert.equal(upperJava.valid, false);
  assert.ok(validateWorkspaceFilename("Main.CPP", "cpp", []));
  assert.equal(validateWorkspaceFilename("Main.cpp", "cpp", []), null);

  const overTime = validateExecutionRequest({
    language: "python",
    sourceCode: "print(1)",
    timeLimitMs: 10000,
  });
  assert.equal(overTime.valid, true);
  assert.equal(overTime.request.timeLimitMs, 5000);

  const atLimit = validateExecutionRequest({
    language: "python",
    sourceCode: "print(1)",
    timeLimitMs: 5000,
  });
  assert.equal(atLimit.valid, true);
  assert.equal(atLimit.request.timeLimitMs, 5000);
});

test("sidebar dropdowns toggle locally without forced navigation or eager RSC prefetches and app views use skeletons", () => {
  const sidebar = readFileSync(new URL("../components/app/app-sidebar.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(sidebar, /router\.push/);
  assert.match(sidebar, /prefetch=\{false\}/);

  const appLoading = readFileSync(new URL("../app/app/loading.tsx", import.meta.url), "utf8");
  assert.match(appLoading, /PageSkeleton/);

  const friends = readFileSync(new URL("../components/app/friends-view.tsx", import.meta.url), "utf8");
  assert.match(friends, /FriendsContentSkeleton/);
  assert.match(friends, /SYNCED_PROFILE_KEY/);
});

test("POST /api/account/school verifies Clerk ownership before checking duplicate school_email (no enumeration oracle)", async () => {
  const tables = {
    profiles: [
      { user_id: "victim", school_email: "victim@lspu.edu.ph", campus_id: "santa-cruz" },
      { user_id: "attacker", school_email: null, campus_id: null },
    ],
  };
  let queriedProfiles = false;
  const baseDb = fakeDb(tables);
  const trackingDb = () => ({
    from(name) {
      if (name === "profiles") queriedProfiles = true;
      return baseDb().from(name);
    },
  });
  const route = loadTs("app/api/account/school/route.ts", {
    "next/server": { NextResponse },
    "@clerk/nextjs/server": { currentUser: async () => ({ emailAddresses: [] }) },
    "@/lib/accounts/read-json": { readJson: async (req) => ({ ok: true, value: await req.json() }) },
    "@/lib/accounts/rules": {
      checkSchoolAccount: async () => ({
        ok: true,
        account: { email: "victim@lspu.edu.ph", age: 20, school: { id: "lspu", name: "LSPU", campusId: "santa-cruz", campus: "Santa Cruz", program: "BSCS" } },
      }),
    },
    "@/lib/accounts/school-directory": { schoolDirectory: {} },
    "@/lib/api/route-handler": { withApiErrors: async (_name, fn) => fn() },
    "@/lib/auth/viewer": { getViewer: async () => ({ id: "attacker", campusId: undefined }) },
    "@/lib/db/client": { db: trackingDb, must },
  });

  const res = await route.POST(new Request("http://localhost/api/account/school", { method: "POST", body: "{}" }));
  assert.equal(res.status, 403);
  assert.equal(queriedProfiles, false, "must reject unverified email before querying profiles.school_email");
});

test("JudgingService chunks batch inputs by 7 MB total stdin bytes so large suites stay under worker 8 MB cap", async () => {
  const { JudgingService } = await import("../lib/judge/judging-service.ts");
  const { ExecutionQueue } = await import("../lib/execution/queue.ts");
  const batchSizes = [];
  const adapter = {
    execute: async () => { throw new Error("should use batch"); },
    checkHealth: async () => ({ isAvailable: true, engine: "test", supportedLanguages: ["python"] }),
    executeBatch: async (_req, stdins) => {
      batchSizes.push(stdins.length);
      return stdins.map(() => ({ status: "SUCCESS", exitCode: 0, stdout: "ok", stderr: "", durationMs: 1 }));
    },
  };
  const bigInput = "x".repeat(4 * 1024 * 1024); // 4 MB each -> 3 inputs (12 MB) split into 3 batches of 1
  const problem = {
    id: "big-io",
    slug: "big-io",
    title: "Big IO",
    description: "",
    difficulty: "beginner",
    category: "Test",
    tags: [],
    supportedLanguages: ["python"],
    inputSpec: "",
    outputSpec: "",
    constraints: [],
    sampleTestCases: [],
    testCases: [
      { id: "t1", input: bigInput, expectedOutput: "ok", isHidden: true },
      { id: "t2", input: bigInput, expectedOutput: "ok", isHidden: true },
      { id: "t3", input: bigInput, expectedOutput: "ok", isHidden: true },
    ],
    timeLimitMs: 2000,
    memoryLimitKb: 128000,
    starterCodes: { python: "", java: "", cpp: "", c: "" },
  };
  const service = new JudgingService({ adapter, queue: new ExecutionQueue({ maxConcurrency: 1 }) });
  const result = await service.judgeSubmission(problem, { language: "python", sourceCode: "print('ok')" });
  assert.equal(result.overallVerdict, "ACCEPTED");
  assert.deepEqual(batchSizes, [1, 1, 1]);
});

test("getViewer auto-creates a missing profile and normalizes is_admin into admin role", async () => {
  const tables = {
    profiles: [
      { user_id: "u-admin", display_name: "Admin", avatar_id: "glitch-bot", border_id: "none", campus_id: null, role: "student", is_admin: true },
    ],
  };
  let activeUserId = "u-new";
  const viewerMod = loadTs("lib/auth/viewer.ts", {
    "server-only": {},
    "@clerk/nextjs/server": {
      auth: async () => ({ userId: activeUserId }),
      currentUser: async () => ({ fullName: "New Coder", firstName: "New", username: "newcoder" }),
    },
    "@/lib/db/client": { db: fakeDb(tables), must },
    "@/lib/profile-validation": { toDisplayName: (v) => (v || "Coder").trim() },
    "@/lib/auth/admin-check": { normalizeRole: (role, isAdmin) => (isAdmin ? "admin" : role === "teacher" ? "teacher" : "student") },
  });

  const created = await viewerMod.getViewer();
  assert.equal(created.id, "u-new");
  assert.equal(created.name, "New Coder");
  assert.equal(created.role, "student");
  assert.equal(tables.profiles.some((p) => p.user_id === "u-new"), true);

  activeUserId = "u-admin";
  const admin = await viewerMod.getViewer();
  assert.equal(admin.role, "admin");
});

test("cn resolves conflicting Tailwind utility classes so overrides win", async () => {
  const { cn } = await import("../lib/utils.ts");
  const heroMount = cn("relative w-full", "absolute inset-x-0 top-0 h-[54vh] min-h-[340px] md:inset-y-0 md:h-auto");
  assert.match(heroMount, /\babsolute\b/);
  assert.doesNotMatch(heroMount, /\brelative\b/);

  const buttonClasses = cn("h-9 px-2.5", "h-11 px-5");
  assert.match(buttonClasses, /\bh-11\b/);
  assert.doesNotMatch(buttonClasses, /\bh-9\b/);
  assert.match(buttonClasses, /\bpx-5\b/);
  assert.doesNotMatch(buttonClasses, /\bpx-2\.5\b/);
});

test("seeded longest-unique-substring lus-4 expects 12 for exekuplatform", () => {
  const sql = readFileSync(new URL("../supabase/migrations/20261122020000_learn_and_curated_problems.sql", import.meta.url), "utf8");
  assert.match(sql, /"id":\s*"lus-4",\s*"input":\s*"exekuplatform",\s*"expectedOutput":\s*"12"/);
});

test("private cls-* class problems enforce class access and award zero global leaderboard points", async () => {
  const tables = {
    events: [],
    tournament_members: [],
    classes: [{ id: "cls-uuid-1", teacher_id: "teacher-1" }],
    class_members: [{ class_id: "cls-uuid-1", user_id: "student-1" }],
    class_problems: [{ class_id: "cls-uuid-1", problem_id: "cls-secret-exam" }],
    problems: [
      {
        id: "cls-secret-exam",
        title: "Secret Exam",
        description: "desc",
        difficulty: "advanced",
        category: "Class",
        tags: [],
        supported_languages: ["python"],
        input_spec: "in",
        output_spec: "out",
        constraints: [],
        test_cases: [{ id: "t1", input: "1", expectedOutput: "1", isHidden: false }],
        time_limit_ms: 2000,
        memory_limit_kb: 128000,
        created_by: "teacher-1",
      },
    ],
    submissions: [],
  };
  const database = { db: fakeDb(tables), exactCount, fetchAllPages, must };
  const store = loadTs("lib/problems/store.ts", {
    "server-only": {},
    "@/lib/db/client": database,
    "@/lib/problems/catalog": {
      getAllProblems: () => [],
      getProblemById: () => null,
      matchesProblemFilter: () => true,
      summarizeProblems: () => [],
      toVisibleProblem: (p) => p,
    },
    "@/lib/workspace-defaults": {
      ALL_SUPPORTED_LANGUAGES: ["python", "java", "cpp", "c"],
      getStarterCode: () => "",
    },
  });

  // Outsider and unauthenticated callers cannot read or probe private cls-* problems.
  assert.equal(await store.findProblem("cls-secret-exam", { userId: "outsider" }), null);
  assert.equal(await store.findProblem("cls-secret-exam"), null);
  assert.equal(await store.problemExists("cls-secret-exam", { userId: "outsider" }), false);

  // Enrolled student, class teacher, and admin (includeLocked) can access it.
  assert.notEqual(await store.findProblem("cls-secret-exam", { userId: "student-1" }), null);
  assert.notEqual(await store.findProblem("cls-secret-exam", { userId: "teacher-1" }), null);
  assert.notEqual(await store.findProblem("cls-secret-exam", { includeLocked: true }), null);

  // Solving a cls-* problem records ACCEPTED with 0 global points and does not increment global firstSolves/solveSummary.
  const solves = loadTs("lib/judge/solves.ts", { "server-only": {}, "@/lib/db/client": database });
  const rec = loadTs("lib/judge/record-submission.ts", {
    "server-only": {},
    "@/lib/db/client": database,
    "@/lib/auth/viewer": { getViewer: async () => ({ id: "student-1", name: "Grace", role: "student" }) },
    "@/lib/judge/solves": solves,
  });

  const milestone = await rec.recordSubmission({ id: "cls-secret-exam", difficulty: "advanced" }, "python", "ACCEPTED");
  assert.deepEqual({ ...milestone }, { firstSolve: true, points: 0, solved: 0 });
  assert.equal(tables.submissions.length, 1);
  assert.equal(tables.submissions[0].points, 0);
  assert.equal(tables.submissions[0].verdict, "ACCEPTED");
  assert.equal((await solves.firstSolves("student-1")).length, 0);
  assert.equal((await solves.solveSummary("student-1")).solved, 0);
});

test("isMissingRelationError matches missing-table errors only, never FK/CHECK/permission errors", async () => {
  const { isMissingRelationError } = await import("./fixtures/fake-db.mjs");
  assert.equal(isMissingRelationError({ code: "42P01", message: 'relation "public.learn_progress" does not exist' }, ["learn_progress"]), true);
  assert.equal(isMissingRelationError({ code: "PGRST205", message: "Could not find the table 'public.notifications' in the schema cache" }, ["notifications"]), true);
  assert.equal(isMissingRelationError({ code: "23503", message: 'insert or update on table "learn_progress" violates foreign key constraint' }, ["learn_progress"]), false);
  assert.equal(isMissingRelationError({ code: "23514", message: 'new row for relation "class_activities" violates check constraint' }, ["class_activities"]), false);
  assert.equal(isMissingRelationError({ code: "42501", message: 'permission denied for table notifications' }, ["notifications"]), false);
});

test("checkSameOriginCsrf blocks cross-site and cross-origin mutations while allowing same-origin and GET requests", async () => {
  const { checkSameOriginCsrf } = await import("../lib/auth/access.ts");
  assert.equal(checkSameOriginCsrf({ method: "GET", url: "https://exeku.app/api/problems", headers: new Headers({ origin: "https://evil.test", "sec-fetch-site": "cross-site" }) }), null);
  assert.equal(checkSameOriginCsrf({ method: "POST", url: "https://exeku.app/api/judge", headers: new Headers({ host: "exeku.app", origin: "https://exeku.app", "sec-fetch-site": "same-origin" }) }), null);
  assert.match(checkSameOriginCsrf({ method: "POST", url: "https://exeku.app/api/judge", headers: new Headers({ host: "exeku.app", origin: "https://evil.test", "sec-fetch-site": "cross-site" }) }) ?? "", /cross-site/i);
  assert.match(checkSameOriginCsrf({ method: "PATCH", url: "https://exeku.app/api/notifications", headers: new Headers({ host: "exeku.app", origin: "https://evil.test" }) }) ?? "", /cross-origin/i);
});

test("org decide atomically claims pending application so a second decision returns 404 without conflicting notifications", async () => {
  const appId = "22222222-2222-4222-8222-222222222222";
  const tables = {
    orgs: [{ id: "acoes", name: "ACOES", school_name: "LSPU", campus_id: "sc", campus_name: "Santa Cruz", program_name: "BSCPE", adviser_id: null }],
    org_members: [{ id: "m1", org_id: "acoes", user_id: "pres", role: "president" }],
    org_applications: [{ id: appId, org_id: "acoes", user_id: "applicant", program: "BSCPE", status: "pending" }],
  };
  const notices = [];
  const { isObject, isUuid, text } = await import("../lib/accounts/rules.ts");
  const orgRules = await import("../lib/orgs/rules.ts");
  const repo = loadTs("lib/orgs/repository.ts", {
    "server-only": {},
    "@/lib/db/client": { db: fakeDb(tables), exactCount, fetchAllPages, must },
    "@/lib/dates": { todayInManila: () => "2026-11-25" },
    "@/lib/accounts/rules": { isObject, isUuid, text },
    "@/lib/competition/repository": { toEvents: async () => [], clearFeatured: async () => {} },
    "@/lib/notifications/repository": { notifyUsers: async (ids, payload) => { notices.push({ ids, title: payload.title }); } },
    "./rules": orgRules,
  });

  const officer = { id: "pres", name: "President", role: "student" };
  const [first, second] = await Promise.all([
    repo.performOrgAction("acoes", officer, { action: "decide", applicationId: appId, accept: true }),
    repo.performOrgAction("acoes", officer, { action: "decide", applicationId: appId, accept: false }),
  ]);

  assert.equal(first.ok, true);
  assert.equal(second.ok, false);
  assert.equal(second.status, 404);
  assert.equal(notices.length, 1);
  assert.match(notices[0].title, /Accepted into ACOES/);
  assert.equal(tables.org_applications.length, 0);
  assert.equal(tables.org_members.some((m) => m.user_id === "applicant" && m.role === "member"), true);
});

test("Button renders animated Loader2 spinner and aria-busy when loading, and friends/tournament flows use ConfirmDialog", () => {
  const Loader2 = () => null;
  const ButtonPrimitive = () => null;
  const jsx = (type, props) => ({ type, props });
  const mod = loadTs("components/ui/button.tsx", {
    "react/jsx-runtime": { jsx, jsxs: jsx, Fragment: "Fragment" },
    "@base-ui/react/button": { Button: ButtonPrimitive },
    "class-variance-authority": { cva: () => () => "btn" },
    "lucide-react": { Loader2 },
    "@/lib/utils": { cn: (...parts) => parts.filter(Boolean).join(" ") },
  });

  const savingEl = mod.Button({ loading: true, loadingText: "Saving…", children: "Save changes" });
  assert.equal(savingEl.props.disabled, true);
  assert.equal(savingEl.props["aria-busy"], true);
  assert.equal(savingEl.props.children.props.children[0].type, Loader2);
  assert.match(savingEl.props.children.props.children[0].props.className, /animate-spin/);
  assert.equal(savingEl.props.children.props.children[1], "Saving…");

  const iconEl = mod.Button({ size: "icon-sm", loading: true, children: "Add" });
  assert.equal(iconEl.props.disabled, true);
  assert.equal(iconEl.props.children.type, Loader2);

  const idleEl = mod.Button({ children: "Save changes" });
  assert.equal(idleEl.props.disabled, false);
  assert.equal(idleEl.props["aria-busy"], undefined);
  assert.equal(idleEl.props.children, "Save changes");

  for (const rel of [
    "../components/app/friends-view.tsx",
    "../components/app/public-profile-view.tsx",
    "../components/app/events/tournament-view.tsx",
  ]) {
    const src = readFileSync(new URL(rel, import.meta.url), "utf8");
    assert.match(src, /ConfirmDialog/);
    assert.match(src, /loading=/);
  }
});
