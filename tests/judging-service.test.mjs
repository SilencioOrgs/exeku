import test from "node:test";
import assert from "node:assert/strict";
import { normalizeOutput, compareOutputs } from "../lib/judge/output-normalizer.ts";
import { JudgingService } from "../lib/judge/judging-service.ts";
import { MockSandboxAdapter } from "../lib/execution/mock-adapter.ts";
import { ExecutionQueue } from "../lib/execution/queue.ts";

test("outputNormalizer - normalizes CRLF and trailing whitespace", () => {
  const rawWindows = "Hello, Exeku!   \r\n42\r\n\r\n";
  const expectedUnix = "Hello, Exeku!\n42";

  assert.equal(normalizeOutput(rawWindows), expectedUnix);
  assert.equal(compareOutputs(rawWindows, "Hello, Exeku!\n42\n"), true);
});

test("outputNormalizer - preserves internal spacing and indentation", () => {
  const codeIndent = "    def foo():\n        return 1\n";
  assert.equal(normalizeOutput(codeIndent), "    def foo():\n        return 1");
  assert.equal(compareOutputs("4 5", "4  5"), false);
});

test("JudgingService - calculates ACCEPTED verdict when all test cases match", async () => {
  const mockAdapter = new MockSandboxAdapter();
  // Problem: sum-two-integers
  // Inputs: "10 20" -> 30, "-5 12" -> 7, "0 0" -> 0, "-100 -250" -> -350, "1000 -1000" -> 0
  mockAdapter.setMockResponse("python:10 20", {
    status: "SUCCESS",
    exitCode: 0,
    stdout: "30\n",
    stderr: "",
    durationMs: 25,
  });
  mockAdapter.setMockResponse("python:-5 12", {
    status: "SUCCESS",
    exitCode: 0,
    stdout: "7\n",
    stderr: "",
    durationMs: 22,
  });
  mockAdapter.setMockResponse("python:0 0", {
    status: "SUCCESS",
    exitCode: 0,
    stdout: "0\n",
    stderr: "",
    durationMs: 20,
  });
  mockAdapter.setMockResponse("python:-100 -250", {
    status: "SUCCESS",
    exitCode: 0,
    stdout: "-350\n",
    stderr: "",
    durationMs: 21,
  });
  mockAdapter.setMockResponse("python:1000 -1000", {
    status: "SUCCESS",
    exitCode: 0,
    stdout: "0\n",
    stderr: "",
    durationMs: 23,
  });

  const judge = new JudgingService({
    adapter: mockAdapter,
    queue: new ExecutionQueue({ maxConcurrency: 2 }),
  });

  const result = await judge.judgeSubmission("sum-two-integers", {
    language: "python",
    sourceCode: "a, b = map(int, input().split()); print(a + b)",
  });

  assert.equal(result.overallVerdict, "ACCEPTED");
  assert.equal(result.passedTests, 5);
  assert.equal(result.totalTests, 5);
  assert.equal(result.scorePercentage, 100);
});

test("JudgingService - calculates WRONG_ANSWER and redacts hidden test data", async () => {
  const mockAdapter = new MockSandboxAdapter();
  // Visible test 1 passes
  mockAdapter.setMockResponse("python:10 20", {
    status: "SUCCESS",
    exitCode: 0,
    stdout: "30\n",
    stderr: "",
    durationMs: 20,
  });
  // Visible test 2 passes
  mockAdapter.setMockResponse("python:-5 12", {
    status: "SUCCESS",
    exitCode: 0,
    stdout: "7\n",
    stderr: "",
    durationMs: 20,
  });
  // Hidden test 1 fails with incorrect answer
  mockAdapter.setMockResponse("python:0 0", {
    status: "SUCCESS",
    exitCode: 0,
    stdout: "999\n", // wrong answer
    stderr: "",
    durationMs: 20,
  });
  mockAdapter.setMockResponse("python:-100 -250", {
    status: "SUCCESS",
    exitCode: 0,
    stdout: "-350\n",
    stderr: "",
    durationMs: 20,
  });
  mockAdapter.setMockResponse("python:1000 -1000", {
    status: "SUCCESS",
    exitCode: 0,
    stdout: "0\n",
    stderr: "",
    durationMs: 20,
  });

  const judge = new JudgingService({
    adapter: mockAdapter,
    queue: new ExecutionQueue({ maxConcurrency: 2 }),
  });

  const result = await judge.judgeSubmission("sum-two-integers", {
    language: "python",
    sourceCode: "mock source code",
  });

  assert.equal(result.overallVerdict, "WRONG_ANSWER");
  assert.equal(result.passedTests, 4);
  assert.equal(result.totalTests, 5);
  assert.equal(result.scorePercentage, 80);

  // Check hidden test redaction:
  const hiddenResults = result.testResults.filter((t) => t.isHidden);
  assert.equal(hiddenResults.length, 3);
  for (const hidden of hiddenResults) {
    assert.equal(hidden.input, undefined);
    assert.equal(hidden.expectedOutput, undefined);
    assert.equal(hidden.actualOutput, undefined);
  }

  // Visible tests must provide input/expectedOutput
  const visibleResults = result.testResults.filter((t) => !t.isHidden);
  assert.equal(visibleResults.length, 2);
  assert.notEqual(visibleResults[0].input, undefined);
  assert.notEqual(visibleResults[0].expectedOutput, undefined);
});

test("JudgingService - short-circuits on COMPILATION_ERROR", async () => {
  const mockAdapter = new MockSandboxAdapter();
  mockAdapter.setMockResponse("java", {
    status: "COMPILATION_ERROR",
    exitCode: 1,
    stdout: "",
    stderr: "Main.java:1: error: class, interface, or enum expected",
    compilerOutput: "Main.java:1: error: class, interface, or enum expected",
    durationMs: 15,
  });

  const judge = new JudgingService({
    adapter: mockAdapter,
    queue: new ExecutionQueue({ maxConcurrency: 2 }),
  });

  const result = await judge.judgeSubmission("hello-world", {
    language: "java",
    sourceCode: "broken syntax",
  });

  assert.equal(result.overallVerdict, "COMPILATION_ERROR");
  assert.equal(result.passedTests, 0);
  assert.match(result.compilerOutput || "", /Main\.java:1: error/);
});
