// TEST FIXTURE ONLY. Clerk's auth() needs a real request context, so API routes load with it stubbed,
// through the same stubbed-require pattern as the app shell test. Everything else is the real code.
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { NextResponse } from "next/server";
import * as readJson from "../../lib/accounts/read-json.ts";
import * as validation from "../../lib/execution/validation.ts";
import * as queue from "../../lib/execution/queue.ts";
import * as judgingService from "../../lib/judge/judging-service.ts";
import * as catalog from "../../lib/problems/catalog.ts";
import * as executionTypes from "../../types/execution.ts";

export function loadRouteExports(path, userId = "user_route") {
  const source = readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const loaded = { exports: {} };
  const modules = {
    "next/server": { NextResponse },
    "next/navigation": { unstable_rethrow: () => {} },
    "@clerk/nextjs/server": { auth: async () => ({ userId }) },
    "@/lib/accounts/read-json": readJson,
    "@/lib/admin/guard": { isAdmin: async () => false },
    "@/lib/execution/validation": validation,
    "@/lib/execution/queue": queue,
    "@/lib/judge/judging-service": judgingService,
    "@/lib/judge/record-submission": { recordSubmission: async () => {} },
    "@/lib/problems/catalog": catalog,
    "@/lib/problems/store": {
      findProblem: async (id) => catalog.getProblemById(id),
      findVisibleProblem: async (id) => catalog.getVisibleProblem(id),
      listProblemSummaries: async (filter) => catalog.getProblemSummaries(filter),
    },
    "@/types/execution": executionTypes,
  };
  vm.runInNewContext(output, {
    module: loaded, exports: loaded.exports, URL, console,
    require: (name) => { if (name in modules) return modules[name]; throw Error(`unexpected import: ${name}`); },
  });
  return loaded.exports;
}

export const loadRoute = (path, userId) => loadRouteExports(path, userId).POST;
