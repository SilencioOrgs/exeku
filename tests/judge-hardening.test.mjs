import test from "node:test";
import assert from "node:assert/strict";
import { JudgingService } from "../lib/judge/judging-service.ts";
import { ExecutionQueue } from "../lib/execution/queue.ts";
import { ExekuJudgeAdapter } from "../lib/execution/exeku-judge-adapter.ts";
import { validateExecutionRequest } from "../lib/execution/validation.ts";

const service = (execute) => new JudgingService({ adapter: { execute, checkHealth: async () => ({}) }, queue: new ExecutionQueue() });

test("hidden test input never comes back through stderr, even when a program prints it and crashes", async () => {
  for (const status of ["RUNTIME_ERROR", "TIME_LIMIT_EXCEEDED"]) {
    const result = await service(async (req) => ({ status, exitCode: 1, stdout: "", stderr: "LEAK:" + req.stdin, durationMs: 1 }))
      .judgeSubmission("sum-two-integers", { language: "python", sourceCode: "x" });
    const hidden = result.testResults.filter((t) => t.isHidden);
    assert.ok(hidden.length > 0);
    for (const t of hidden) assert.equal(t.stderr, undefined, status);
    assert.ok(result.testResults.some((t) => !t.isHidden && t.stderr?.startsWith("LEAK:")), "visible tests keep stderr");
  }
});

test("a sandbox HTTP error is a judge error, not a wrong answer", async () => {
  const result = await service(async () => ({ status: "INTERNAL_ERROR", exitCode: null, stdout: "", stderr: "HTTP 400", durationMs: 1, error: "python-3.10.0 runtime is unknown" }))
    .judgeSubmission("hello-world", { language: "python", sourceCode: "x" });
  assert.equal(result.overallVerdict, "INTERNAL_JUDGE_ERROR");
  assert.equal(result.testResults.length, 0);
  assert.match(result.error, /runtime is unknown/);
});

test("a compile that was killed (no output, no runs) is a compile error, not 'sandbox unavailable'", () => {
  const [result] = new ExekuJudgeAdapter().transformResponse({ compile: { ok: false, output: "", timeMs: 5 }, runs: [] }, 1);
  assert.equal(result.status, "COMPILATION_ERROR");
  assert.match(result.compilerOutput, /failed/);
});

test("a run killed by a signal is a runtime error, never SUCCESS", () => {
  const [result] = new ExekuJudgeAdapter().transformResponse({ compile: null, runs: [{ status: "RUNTIME_ERROR", exitCode: null, stdout: "42", stderr: "", timeMs: 1, memoryKb: 1 }] }, 1);
  assert.equal(result.status, "RUNTIME_ERROR");
});

test("memory limit reaches the judge in KB for every language and is capped at 256 MB", () => {
  const adapter = new ExekuJudgeAdapter();
  assert.equal(adapter.buildPayload({ language: "python", sourceCode: "x", memoryLimitKb: 128000 }, [""]).memoryLimitKb, 128000);
  assert.equal(adapter.buildPayload({ language: "java", sourceCode: "x", memoryLimitKb: 128000 }, [""]).memoryLimitKb, 128000);
  const huge = validateExecutionRequest({ language: "c", sourceCode: "int main(){}", memoryLimitKb: 4_000_000 });
  assert.equal(huge.valid && huge.request.memoryLimitKb, 256000);
});
