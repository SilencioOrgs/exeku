import test from "node:test";
import assert from "node:assert/strict";
import { validateExecutionRequest } from "../lib/execution/validation.ts";
import { ExekuJudgeAdapter } from "../lib/execution/exeku-judge-adapter.ts";
import { MockSandboxAdapter } from "../lib/execution/mock-adapter.ts";

test("validateExecutionRequest - validates valid python request", () => {
  const result = validateExecutionRequest({
    language: "python",
    sourceCode: "print('Hello, Exeku!')\n",
    stdin: "input data",
  });

  assert.equal(result.valid, true);
  if (result.valid) {
    assert.equal(result.request.language, "python");
    assert.equal(result.request.sourceCode, "print('Hello, Exeku!')\n");
    assert.equal(result.request.stdin, "input data");
  }
});

test("validateExecutionRequest - rejects unsupported language", () => {
  const result = validateExecutionRequest({
    language: "ruby",
    sourceCode: "puts 'hello'",
  });

  assert.equal(result.valid, false);
  if (!result.valid) {
    assert.match(result.error, /unsupported language/i);
  }
});

test("validateExecutionRequest - rejects missing source code", () => {
  const result = validateExecutionRequest({
    language: "java",
    sourceCode: "",
  });

  assert.equal(result.valid, false);
  if (!result.valid) {
    assert.match(result.error, /source code cannot be empty/i);
  }
});

test("validateExecutionRequest - rejects oversized source code (>64KB)", () => {
  const largeCode = "a".repeat(65 * 1024);
  const result = validateExecutionRequest({
    language: "cpp",
    sourceCode: largeCode,
  });

  assert.equal(result.valid, false);
  if (!result.valid) {
    assert.match(result.error, /exceeds maximum allowed length/i);
  }
});

test("validateExecutionRequest - rejects oversized stdin (>64KB)", () => {
  const largeStdin = "x".repeat(65 * 1024);
  const result = validateExecutionRequest({
    language: "c",
    sourceCode: "int main() { return 0; }",
    stdin: largeStdin,
  });

  assert.equal(result.valid, false);
  if (!result.valid) {
    assert.match(result.error, /stdin exceeds maximum allowed length/i);
  }
});

test("MockSandboxAdapter - executes mock successful code", async () => {
  const adapter = new MockSandboxAdapter();
  adapter.setMockResponse("python", {
    status: "SUCCESS",
    exitCode: 0,
    stdout: "Hello, Exeku!\n",
    stderr: "",
    durationMs: 42,
  });

  const res = await adapter.execute({
    language: "python",
    sourceCode: "print('Hello, Exeku!')",
  });

  assert.equal(res.status, "SUCCESS");
  assert.equal(res.exitCode, 0);
  assert.equal(res.stdout, "Hello, Exeku!\n");
  assert.equal(res.durationMs, 42);
});

test("ExekuJudgeAdapter - maps Java filename to Main.java and sends the input and time limit", () => {
  const adapter = new ExekuJudgeAdapter({ baseUrl: "http://localhost:4000" });
  const payload = adapter.buildPayload({
    language: "java",
    sourceCode: "public class Main {}",
    timeLimitMs: 2000,
  }, ["123"]);

  assert.equal(payload.language, "java");
  assert.equal(payload.files[0].name, "Main.java");
  assert.equal(payload.files[0].content, "public class Main {}");
  assert.deepEqual(payload.stdins, ["123"]);
  assert.equal(payload.timeLimitMs, 2000);
});

test("ExekuJudgeAdapter - a compile error is never SUCCESS, even if runs are present", () => {
  const adapter = new ExekuJudgeAdapter({ baseUrl: "http://localhost:4000" });
  const [parsed] = adapter.transformResponse({
    compile: { ok: false, output: "Main.java:2: error: ';' expected\n", timeMs: 120 },
    runs: [{ status: "SUCCESS", exitCode: 0, stdout: "42", stderr: "", timeMs: 1, memoryKb: 1 }],
  }, 1);

  assert.equal(parsed.status, "COMPILATION_ERROR");
  assert.equal(parsed.compilerOutput, "Main.java:2: error: ';' expected\n");
  assert.equal(parsed.durationMs, 120);
});

test("ExekuJudgeAdapter - keeps a timeout as TIME_LIMIT_EXCEEDED", () => {
  const adapter = new ExekuJudgeAdapter({ baseUrl: "http://localhost:4000" });
  const [parsed] = adapter.transformResponse({
    compile: null,
    runs: [{ status: "TIME_LIMIT_EXCEEDED", exitCode: null, stdout: "", stderr: "", timeMs: 2050, memoryKb: 900, message: "Time limit exceeded." }],
  }, 1);

  assert.equal(parsed.status, "TIME_LIMIT_EXCEEDED");
  assert.equal(parsed.durationMs, 2050);
  assert.equal(parsed.stderr, "Time limit exceeded.");
});

test("ExekuJudgeAdapter - a program killed by a signal is never SUCCESS", () => {
  const adapter = new ExekuJudgeAdapter({ baseUrl: "http://localhost:4000" });
  const killed = { exitCode: null, stdout: "correct answer\n", stderr: "", timeMs: 5, memoryKb: 900 };
  const [reported, misreported] = adapter.transformResponse({
    compile: null,
    runs: [{ ...killed, status: "RUNTIME_ERROR", message: "Caught fatal signal 11" }, { ...killed, status: "SUCCESS" }],
  }, 2);

  assert.equal(reported.status, "RUNTIME_ERROR");
  assert.equal(misreported.status, "RUNTIME_ERROR");
});
