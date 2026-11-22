import test from "node:test";
import assert from "node:assert/strict";
import { ExekuJudgeAdapter } from "../lib/execution/exeku-judge-adapter.ts";
import { createExecutionAdapter } from "../lib/execution/engine.ts";
import { ExecutionQueue, QueueFullError } from "../lib/execution/queue.ts";
import { JudgingService } from "../lib/judge/judging-service.ts";
import { getProblemById } from "../lib/problems/catalog.ts";

const jsonResponse = (status, body) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const adapterWith = (respond) => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init, body: init?.body ? JSON.parse(init.body) : undefined });
    return respond(calls.length);
  };
  return { adapter: new ExekuJudgeAdapter({ baseUrl: "http://judge.test/", token: "secret", fetchImpl }), calls };
};
const request = { language: "cpp", sourceCode: "int main(){}", timeLimitMs: 2000, memoryLimitKb: 128000 };

test("the execution engine is the Exeku judge", () => {
  assert.ok(createExecutionAdapter({}) instanceof ExekuJudgeAdapter);
});

test("health is available only when the judge reports all four languages", async () => {
  const health = (languages) => adapterWith(() => jsonResponse(200, { version: "1", languages })).adapter.checkHealth();
  assert.equal((await health(["python", "java", "cpp", "c"])).isAvailable, true);
  const partial = await health(["python", "cpp", "c"]);
  assert.equal(partial.isAvailable, false);
  assert.deepEqual(partial.supportedLanguages, ["python", "cpp", "c"]);
  assert.deepEqual(partial.missingLanguages, ["java"], "the notice can say which ones");
  assert.equal((await health(undefined)).isAvailable, false);
});

test("batch request sends the token, the main file first and one stdin per test", async () => {
  const { adapter, calls } = adapterWith(() => jsonResponse(200, { compile: { ok: true, output: "", timeMs: 400 }, runs: [{ status: "SUCCESS", exitCode: 0, stdout: "1", stderr: "", timeMs: 3, memoryKb: 900 }, { status: "SUCCESS", exitCode: 0, stdout: "2", stderr: "", timeMs: 4, memoryKb: 900 }] }));
  const results = await adapter.executeBatch({ ...request, files: [{ name: "main.cpp", content: "int main(){}" }, { name: "util.h", content: "" }] }, ["a", "b"]);
  assert.equal(calls[0].url, "http://judge.test/v1/run");
  assert.equal(calls[0].init.headers.Authorization, "Bearer secret");
  assert.deepEqual(calls[0].body.files.map((f) => f.name), ["main.cpp", "util.h"]);
  assert.deepEqual(calls[0].body.stdins, ["a", "b"]);
  assert.deepEqual(results.map((r) => [r.status, r.stdout, r.durationMs, r.memoryUsedKb]), [["SUCCESS", "1", 3, 900], ["SUCCESS", "2", 4, 900]]);
});

test("a compile error is reported for every input; worker messages fill empty stderr", async () => {
  const compileError = adapterWith(() => jsonResponse(200, { compile: { ok: false, output: "main.cpp:1: error", timeMs: 300 }, runs: [] }));
  const failed = await compileError.adapter.executeBatch(request, ["1", "2", "3"]);
  assert.equal(failed.length, 3);
  assert.ok(failed.every((r) => r.status === "COMPILATION_ERROR" && r.compilerOutput === "main.cpp:1: error"));

  const limits = adapterWith(() => jsonResponse(200, { compile: null, runs: [{ status: "MEMORY_LIMIT_EXCEEDED", exitCode: null, stdout: "", stderr: "", timeMs: 50, memoryKb: 131072, message: "Memory limit exceeded." }, { status: "WEIRD", exitCode: 0, stdout: "", stderr: "", timeMs: 1, memoryKb: 1 }] }));
  const [mle, unknown] = await limits.adapter.executeBatch({ ...request, language: "python" }, ["", ""]);
  assert.equal(mle.status, "MEMORY_LIMIT_EXCEEDED");
  assert.equal(mle.stderr, "Memory limit exceeded.");
  assert.equal(unknown.status, "INTERNAL_ERROR", "unknown statuses are the judge's fault, never a verdict");

  const short = adapterWith(() => jsonResponse(200, { compile: null, runs: [] }));
  assert.equal((await short.adapter.execute(request)).status, "INTERNAL_ERROR");
});

test("offline judge, wrong token and full queue each fail safely without leaking internals", async () => {
  const offline = new ExekuJudgeAdapter({ baseUrl: "http://judge.test", fetchImpl: async () => { throw new TypeError("fetch failed"); } });
  const offlineRes = await offline.execute(request);
  assert.equal(offlineRes.status, "SERVICE_UNAVAILABLE");
  assert.doesNotMatch(offlineRes.stderr, /judge\.test/);
  assert.equal((await offline.checkHealth()).isAvailable, false);

  const wrongToken = adapterWith(() => jsonResponse(401, { error: "Missing or wrong judge token." }));
  const denied = await wrongToken.adapter.execute(request);
  assert.equal(denied.status, "INTERNAL_ERROR");
  assert.doesNotMatch(denied.stderr, /JUDGE_TOKEN|judge\.test/);

  const busy = adapterWith(() => jsonResponse(429, { error: "full" }));
  await assert.rejects(busy.adapter.execute(request), QueueFullError);
});

test("judging uses one batch call and reports memory limit without leaking hidden tests", async () => {
  const problem = getProblemById("sum-two-integers");
  assert.ok(problem && problem.testCases.length > 1);
  let batchCalls = 0;
  const adapter = {
    execute: async () => { throw new Error("per-test path must not run when batches are supported"); },
    checkHealth: async () => ({ isAvailable: true, engine: "test", supportedLanguages: ["python"] }),
    executeBatch: async (_request, stdins) => {
      batchCalls++;
      return stdins.map((_, i) =>
        i === stdins.length - 1
          ? { status: "MEMORY_LIMIT_EXCEEDED", exitCode: null, stdout: "partial", stderr: "Memory limit exceeded.", durationMs: 40, memoryUsedKb: 131072 }
          : { status: "SUCCESS", exitCode: 0, stdout: problem.testCases[i].expectedOutput, stderr: "", durationMs: 10 }
      );
    },
  };
  const service = new JudgingService({ adapter, queue: new ExecutionQueue({ maxConcurrency: 1 }) });
  const result = await service.judgeSubmission(problem.id, { language: "python", sourceCode: "print(1)" });
  assert.equal(batchCalls, 1);
  assert.equal(result.overallVerdict, "MEMORY_LIMIT_EXCEEDED");
  assert.equal(result.passedTests, problem.testCases.length - 1);
  const last = result.testResults.at(-1);
  assert.equal(last.verdict, "MEMORY_LIMIT_EXCEEDED");
  if (problem.testCases.at(-1).isHidden) {
    assert.equal(last.input, undefined);
    assert.equal(last.actualOutput, undefined);
    assert.equal(last.stderr, undefined);
  }
});

test("external AbortSignal aborts in-flight judge fetch and throws QueueAbortedError", async () => {
  const { QueueAbortedError } = await import("../lib/execution/queue.ts");
  let fetchSignalAborted = false;
  const adapter = new ExekuJudgeAdapter({
    baseUrl: "http://judge.test",
    token: "secret",
    fetchImpl: (_url, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          fetchSignalAborted = true;
          reject(new DOMException("Aborted", "AbortError"));
        });
      }),
  });
  const controller = new AbortController();
  const pending = adapter.execute(request, controller.signal);
  controller.abort();
  await assert.rejects(pending, QueueAbortedError);
  assert.equal(fetchSignalAborted, true);
});
