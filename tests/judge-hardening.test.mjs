import test from "node:test";
import assert from "node:assert/strict";
import { JudgingService } from "../lib/judge/judging-service.ts";
import { ExecutionQueue } from "../lib/execution/queue.ts";
import { ExekuJudgeAdapter } from "../lib/execution/exeku-judge-adapter.ts";
import { validateExecutionRequest } from "../lib/execution/validation.ts";
import { getProblemById } from "./fixtures/sample-problems.ts";

const service = (execute) => new JudgingService({ adapter: { execute, checkHealth: async () => ({}) }, queue: new ExecutionQueue() });

test("hidden test input never comes back through stderr, even when a program prints it and crashes", async () => {
  const sumProblem = getProblemById("sum-two-integers");
  for (const status of ["RUNTIME_ERROR", "TIME_LIMIT_EXCEEDED"]) {
    const result = await service(async (req) => ({ status, exitCode: 1, stdout: "", stderr: "LEAK:" + req.stdin, durationMs: 1 }))
      .judgeSubmission(sumProblem, { language: "python", sourceCode: "x" });
    const hidden = result.testResults.filter((t) => t.isHidden);
    assert.ok(hidden.length > 0);
    for (const t of hidden) assert.equal(t.stderr, undefined, status);
    assert.ok(result.testResults.some((t) => !t.isHidden && t.stderr?.startsWith("LEAK:")), "visible tests keep stderr");
  }
});

test("no verdict type ever exposes a hidden test's input, expected output, program output or stderr", async () => {
  const problem = getProblemById("sum-two-integers");
  const expected = new Map(problem.testCases.map((t) => [t.input, t.expectedOutput]));
  const leaked = (stdin) => ({ exitCode: 0, stderr: "LEAK:err:" + stdin, durationMs: 1, stdout: "LEAK:out:" + stdin });
  const runs = {
    WRONG_ANSWER: (stdin) => ({ ...leaked(stdin), status: "SUCCESS" }),
    TIME_LIMIT_EXCEEDED: (stdin) => ({ ...leaked(stdin), status: "TIME_LIMIT_EXCEEDED", exitCode: null }),
    MEMORY_LIMIT_EXCEEDED: (stdin) => ({ ...leaked(stdin), status: "MEMORY_LIMIT_EXCEEDED", exitCode: null }),
    RUNTIME_ERROR: (stdin) => ({ ...leaked(stdin), status: "RUNTIME_ERROR", exitCode: 1 }),
    PASSED: (stdin) => ({ ...leaked(stdin), status: "SUCCESS", stdout: expected.get(stdin) }),
  };
  for (const [verdict, run] of Object.entries(runs)) {
    const result = await service(async (req) => run(req.stdin)).judgeSubmission(problem, { language: "python", sourceCode: "x" });
    const hidden = result.testResults.filter((t) => t.isHidden);
    assert.ok(hidden.length > 0, verdict);
    for (const t of hidden) {
      assert.equal(t.verdict, verdict);
      for (const field of ["input", "expectedOutput", "actualOutput", "stderr"]) assert.equal(field in t, false, `${verdict} leaked ${field}`);
      assert.doesNotMatch(JSON.stringify(t), /LEAK/, verdict);
    }
    const visible = result.testResults.find((t) => !t.isHidden);
    assert.equal(visible.verdict, verdict);
    assert.equal(visible.input, problem.testCases.find((t) => t.id === visible.testCaseId).input, "visible tests keep their details");
  }
});

test("a compile error on a hidden test exposes only the compiler's output", async () => {
  const problem = getProblemById("sum-two-integers");
  const hiddenFirst = { ...problem, testCases: [...problem.testCases].sort((a, b) => Number(b.isHidden) - Number(a.isHidden)) };
  assert.equal(hiddenFirst.testCases[0].isHidden, true);
  const original = problem.testCases;
  problem.testCases = hiddenFirst.testCases;
  try {
    const result = await service(async (req) => ({ status: "COMPILATION_ERROR", exitCode: null, stdout: "", stderr: "LEAK:" + req.stdin, compilerOutput: "main.py: bad", durationMs: 1 }))
      .judgeSubmission(problem, { language: "python", sourceCode: "x" });
    const [only] = result.testResults;
    assert.equal(only.verdict, "COMPILATION_ERROR");
    assert.equal(only.compilerOutput, "main.py: bad");
    assert.equal("stderr" in only, false);
    assert.doesNotMatch(JSON.stringify(only), /LEAK/);
  } finally {
    problem.testCases = original;
  }
});

test("a sandbox HTTP error is a judge error, not a wrong answer, and redacts raw upstream details", async () => {
  const helloProblem = getProblemById("hello-world");
  const result = await service(async () => ({ status: "INTERNAL_ERROR", exitCode: null, stdout: "", stderr: "HTTP 400", durationMs: 1, error: "python-3.10.0 runtime is unknown" }))
    .judgeSubmission(helloProblem, { language: "python", sourceCode: "x" });
  assert.equal(result.overallVerdict, "INTERNAL_JUDGE_ERROR");
  assert.equal(result.testResults.length, 0);
  assert.doesNotMatch(result.error ?? "", /runtime is unknown/);
  assert.match(result.error ?? "", /unexpected error/i);
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
