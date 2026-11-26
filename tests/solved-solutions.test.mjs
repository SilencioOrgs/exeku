import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { NextResponse } from "next/server";
import { fetchAllPages, must } from "./fixtures/fake-db.mjs";

function loadTs(relPath, modules, extraGlobals = {}) {
  const source = readFileSync(new URL(`../${relPath}`, import.meta.url), "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const loaded = { exports: {} };
  vm.runInNewContext(output, {
    module: loaded,
    exports: loaded.exports,
    crypto,
    Date,
    URL,
    console,
    setTimeout,
    clearTimeout,
    ...extraGlobals,
    require: (name) => {
      if (name in modules) return modules[name];
      if (name === "@/lib/competition/repository") return { invalidateLeaderboardCache: () => {} };
      throw Error(`unexpected import: ${name}`);
    },
  });
  return loaded.exports;
}

function sortableFakeDb(tables, options = {}) {
  return () => ({
    from(table) {
      const rows = (tables[table] ??= []);
      const filters = [];
      const orders = [];
      let op = "select";
      let selected = "*";
      let payload = null;
      let limitCount = null;
      let rangeSlice = null;

      const exec = () => {
        if (options.missingSourceColumn && op === "select" && /source_code|files/.test(selected)) {
          return { data: null, error: { code: "42703", message: 'column submissions.source_code does not exist' } };
        }
        if (options.missingSourceColumn && op === "insert" && payload && ("source_code" in payload || "files" in payload)) {
          return { data: null, error: { code: "PGRST204", message: "Could not find the 'source_code' column of 'submissions' in the schema cache" } };
        }
        const match = () => rows.filter((r) => filters.every((fn) => fn(r)));
        if (op === "insert") {
          const created = { id: crypto.randomUUID(), created_at: new Date().toISOString(), ...payload };
          rows.push(created);
          return { data: created, error: null };
        }
        if (op === "update") {
          const targets = match();
          targets.forEach((r) => Object.assign(r, payload));
          return { data: targets, error: null };
        }
        let found = [...match()];
        if (orders.length > 0) {
          found.sort((a, b) => {
            for (const { column, ascending } of orders) {
              const av = String(a[column] ?? "");
              const bv = String(b[column] ?? "");
              if (av !== bv) return ascending ? av.localeCompare(bv) : bv.localeCompare(av);
            }
            return 0;
          });
        }
        if (rangeSlice) found = found.slice(rangeSlice[0], rangeSlice[1] + 1);
        if (limitCount !== null) found = found.slice(0, limitCount);
        return { data: found, error: null };
      };

      const builder = {
        select(cols = "*") { selected = cols; return builder; },
        insert(val) { op = "insert"; payload = val; return builder; },
        update(val) { op = "update"; payload = val; return builder; },
        eq(k, v) { filters.push((r) => r[k] === v); return builder; },
        neq(k, v) { filters.push((r) => r[k] !== v); return builder; },
        order(column, opts = {}) { orders.push({ column, ascending: opts.ascending !== false }); return builder; },
        limit(n) { limitCount = n; return builder; },
        range(from, to) { rangeSlice = [from, to]; return builder; },
        then(resolve, reject) { return Promise.resolve(exec()).then(resolve, reject); },
      };
      return builder;
    },
  });
}

test("recordSubmission saves accepted source code, ignores wrong answers, and rewrites previous saved code on re-solve", async () => {
  const tables = { submissions: [] };
  const dbClient = { db: sortableFakeDb(tables), fetchAllPages, must };
  const solves = loadTs("lib/judge/solves.ts", { "server-only": {}, "@/lib/db/client": dbClient });
  const rec = loadTs("lib/judge/record-submission.ts", {
    "server-only": {},
    "@/lib/db/client": dbClient,
    "@/lib/auth/viewer": { getViewer: async () => ({ id: "u1", name: "Ada", role: "student" }) },
    "@/lib/judge/solves": solves,
  });

  // Wrong answer does not save source code and does not mark solved.
  await rec.recordSubmission(
    { id: "two-sum", difficulty: "beginner" },
    "python",
    "WRONG_ANSWER",
    "2026-11-26T10:00:00.000Z",
    "u1",
    { sourceCode: "print('wrong')", files: [{ name: "main.py", content: "print('wrong')" }] },
  );
  assert.equal(tables.submissions[0].source_code, undefined);
  assert.equal(await solves.latestAcceptedSolution("u1", "two-sum"), null);

  // First accepted answer stores code and marks problem solved.
  const first = await rec.recordSubmission(
    { id: "two-sum", difficulty: "beginner" },
    "python",
    "ACCEPTED",
    "2026-11-26T10:05:00.000Z",
    "u1",
    { sourceCode: "print(1 + 2)", files: [{ name: "main.py", content: "print(1 + 2)" }] },
  );
  assert.equal(first.firstSolve, true);
  assert.equal(first.points, 100);

  const solvedSet = await solves.solvedProblemIds("u1");
  assert.equal(solvedSet.has("two-sum"), true);
  assert.equal((await solves.solvedProblemIds("u2")).has("two-sum"), false, "solves stay isolated per user");

  const firstSaved = await solves.latestAcceptedSolution("u1", "two-sum");
  assert.equal(firstSaved?.language, "python");
  assert.equal(firstSaved?.sourceCode, "print(1 + 2)");

  // Re-solving with a new accepted answer overwrites the saved code while keeping history.
  const second = await rec.recordSubmission(
    { id: "two-sum", difficulty: "beginner" },
    "java",
    "ACCEPTED",
    "2026-11-26T11:00:00.000Z",
    "u1",
    {
      sourceCode: "public class Main { public static void main(String[] a) {} }",
      files: [{ name: "Main.java", content: "public class Main { public static void main(String[] a) {} }" }],
    },
  );
  assert.equal(second.firstSolve, false);
  assert.equal(second.points, 0);

  const latest = await solves.latestAcceptedSolution("u1", "two-sum");
  assert.equal(latest?.language, "java");
  assert.match(latest?.sourceCode ?? "", /public class Main/);
  // Previous accepted row had its source_code cleared so only the latest answer remains stored.
  const acceptedRows = tables.submissions.filter((r) => r.verdict === "ACCEPTED");
  assert.equal(acceptedRows.length, 2);
  assert.equal(acceptedRows.filter((r) => r.source_code !== null).length, 1);
});

test("recordSubmission and latestAcceptedSolution degrade gracefully before the SQL migration runs", async () => {
  const tables = { submissions: [] };
  const dbClient = { db: sortableFakeDb(tables, { missingSourceColumn: true }), fetchAllPages, must };
  const solves = loadTs("lib/judge/solves.ts", { "server-only": {}, "@/lib/db/client": dbClient });
  const rec = loadTs("lib/judge/record-submission.ts", {
    "server-only": {},
    "@/lib/db/client": dbClient,
    "@/lib/auth/viewer": { getViewer: async () => ({ id: "u1", name: "Ada", role: "student" }) },
    "@/lib/judge/solves": solves,
  });

  const milestone = await rec.recordSubmission(
    { id: "hello-world", difficulty: "beginner" },
    "python",
    "ACCEPTED",
    "2026-11-26T10:00:00.000Z",
    "u1",
    { sourceCode: "print('hi')" },
  );
  assert.equal(milestone?.firstSolve, true);

  const saved = await solves.latestAcceptedSolution("u1", "hello-world");
  assert.equal(saved?.language, "python");
  assert.equal(saved?.sourceCode, null);
});

test("GET /api/problems and /api/problems/[id] return solved flags and savedSolution with private no-store headers", async () => {
  const problem = {
    id: "two-sum",
    slug: "two-sum",
    title: "Two Sum",
    difficulty: "beginner",
    category: "Arrays",
    tags: ["array"],
    supportedLanguages: ["python", "java"],
    sampleCount: 1,
    totalTestsCount: 3,
  };
  const savedSolution = { language: "java", sourceCode: "class Main {}", solvedAt: "2026-11-26T10:00:00.000Z" };

  const listRoute = loadTs("app/api/problems/route.ts", {
    "next/server": { NextResponse },
    "@clerk/nextjs/server": { auth: async () => ({ userId: "u1" }) },
    "@/lib/api/route-handler": { withApiErrors: (_label, fn) => fn() },
    "@/lib/auth/admin-check": { isAdmin: async () => false },
    "@/lib/judge/solves": { solvedProblemIds: async () => new Set(["two-sum"]) },
    "@/lib/problems/store": { listProblemSummaries: async () => [problem] },
  });
  const listRes = await listRoute.GET(new Request("http://localhost/api/problems"));
  assert.equal(listRes.status, 200);
  assert.equal(listRes.headers.get("Cache-Control"), "private, no-store");
  const listBody = await listRes.json();
  assert.equal(listBody.problems[0].solved, true);

  const detailRoute = loadTs("app/api/problems/[id]/route.ts", {
    "next/server": { NextResponse },
    "@clerk/nextjs/server": { auth: async () => ({ userId: "u1" }) },
    "@/lib/api/route-handler": { withApiErrors: (_label, fn) => fn() },
    "@/lib/auth/admin-check": { isAdmin: async () => false },
    "@/lib/judge/solves": { latestAcceptedSolution: async () => savedSolution },
    "@/lib/problems/store": { findVisibleProblem: async () => ({ ...problem, visibleTestCases: [], sampleTestCases: [], starterCodes: {} }) },
  });
  const detailRes = await detailRoute.GET(new Request("http://localhost/api/problems/two-sum"), {
    params: Promise.resolve({ id: "two-sum" }),
  });
  assert.equal(detailRes.status, 200);
  assert.equal(detailRes.headers.get("Cache-Control"), "private, no-store");
  const detailBody = await detailRes.json();
  assert.equal(detailBody.solved, true);
  assert.deepEqual(detailBody.savedSolution, savedSolution);
});

test("useWorkspaceFiles loads database-saved solution on a new device, switches to its language, and respects newer local drafts", async () => {
  function harness(draftByLang) {
    const slots = [];
    const effects = [];
    let index = 0;
    let effectIndex = 0;
    const react = {
      useState: (initial) => {
        const slot = index++;
        if (!(slot in slots)) slots[slot] = initial;
        return [slots[slot], (v) => { slots[slot] = typeof v === "function" ? v(slots[slot]) : v; }];
      },
      useRef: (initial) => {
        const slot = index++;
        if (!(slot in slots)) slots[slot] = { current: initial };
        return slots[slot];
      },
      useCallback: (fn, deps) => {
        const slot = index++;
        if (slots[slot]?.deps.every((d, i) => d === deps[i])) return slots[slot].fn;
        slots[slot] = { fn, deps };
        return fn;
      },
      useEffect: (run, deps) => {
        const slot = effectIndex++;
        const prev = effects[slot];
        if (!prev || deps.some((d, i) => d !== prev.deps[i])) {
          prev?.cleanup?.();
          effects[slot] = { deps, cleanup: run() };
        }
      },
    };
    const doc = { visibilityState: "visible", addEventListener() {}, removeEventListener() {} };
    const mod = loadTs(
      "hooks/use-workspace-files.ts",
      {
        react,
        "@/lib/storage/draft-repository": {
          draftRepository: {
            getDraft: async (_uid, lang) => draftByLang[lang] ?? null,
            saveDraft: async () => {},
          },
        },
        "@/lib/storage/coding-activity": { recordCodingDay: () => true },
        "@/lib/workspace-defaults": {
          getFilenameForLanguage: (lang) => ({ python: "main.py", java: "Main.java", cpp: "main.cpp", c: "main.c" })[lang],
          getStarterCode: (lang) => `starter:${lang}`,
        },
      },
      { window: doc, document: doc, setTimeout: () => 1, clearTimeout: () => {} },
    );
    const render = (profile, problem, problemId) => {
      index = 0;
      effectIndex = 0;
      return mod.useWorkspaceFiles(profile, problem, problemId);
    };
    return { render };
  }

  const settle = () => new Promise((r) => setImmediate(r));
  const profile = { id: "p1", preferredLanguage: "python" };
  const solvedJavaProblem = {
    id: "two-sum",
    starterCodes: { python: "starter:python", java: "starter:java" },
    solved: true,
    savedSolution: {
      language: "java",
      sourceCode: "public class Main { /* saved */ }",
      files: [{ name: "Main.java", content: "public class Main { /* saved */ }" }],
      solvedAt: "2026-11-26T10:00:00.000Z",
    },
  };

  // New laptop (empty IndexedDB): auto-switches to saved Java solution and displays saved code.
  const freshDevice = harness({});
  freshDevice.render(profile, null, "two-sum");
  await settle();
  freshDevice.render(profile, solvedJavaProblem, "two-sum");
  await settle();
  // Second render picks up solutionLang="java" and runs getDraft("java").
  freshDevice.render(profile, solvedJavaProblem, "two-sum");
  await settle();
  const state = freshDevice.render(profile, solvedJavaProblem, "two-sum");
  assert.equal(state.activeLang, "java");
  assert.equal(state.code, "public class Main { /* saved */ }");

  // Same laptop with a NEWER in-progress local draft: preserves the newer draft, but loadFiles restores saved code on demand.
  const newerDraftDevice = harness({
    python: {
      code: "# newer python work in progress",
      files: [{ name: "main.py", content: "# newer python work in progress" }],
      updatedAt: "2026-11-26T11:00:00.000Z",
    },
  });
  newerDraftDevice.render(profile, solvedJavaProblem, "two-sum");
  await settle();
  const kept = newerDraftDevice.render(profile, solvedJavaProblem, "two-sum");
  assert.equal(kept.activeLang, "python");
  assert.equal(kept.code, "# newer python work in progress");

  // Clicking "Load saved answer" switches language and restores the saved database files.
  await kept.loadFiles("java", solvedJavaProblem.savedSolution.files);
  newerDraftDevice.render(profile, solvedJavaProblem, "two-sum");
  await settle();
  const restored = newerDraftDevice.render(profile, solvedJavaProblem, "two-sum");
  assert.equal(restored.activeLang, "java");
  assert.equal(restored.code, "public class Main { /* saved */ }");
});
