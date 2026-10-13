import test from "node:test";
import assert from "node:assert/strict";
import { validateExecutionRequest } from "../lib/execution/validation.ts";
import { PistonAdapter } from "../lib/execution/piston-adapter.ts";
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

test("PistonAdapter - maps Java filename to Main.java and parses compiler errors", () => {
  const adapter = new PistonAdapter({ baseUrl: "http://localhost:2000" });
  const payload = adapter.buildPistonPayload({
    language: "java",
    sourceCode: "public class Main {}",
    stdin: "123",
    timeLimitMs: 2000,
  });

  assert.equal(payload.language, "java");
  assert.equal(payload.files[0].name, "Main.java");
  assert.equal(payload.files[0].content, "public class Main {}");
  assert.equal(payload.stdin, "123");
  assert.equal(payload.run_timeout, 2000);
});

test("PistonAdapter - transforms compilation failure response", () => {
  const adapter = new PistonAdapter({ baseUrl: "http://localhost:2000" });
  const parsed = adapter.transformPistonResponse({
    compile: {
      stdout: "",
      stderr: "Main.java:2: error: ';' expected\n",
      code: 1,
      output: "Main.java:2: error: ';' expected\n",
    },
    run: {
      stdout: "",
      stderr: "",
      code: 0,
      output: "",
    },
  }, 120);

  assert.equal(parsed.status, "COMPILATION_ERROR");
  assert.equal(parsed.exitCode, 1);
  assert.equal(parsed.compilerOutput, "Main.java:2: error: ';' expected\n");
});

test("PistonAdapter - transforms timeout signal into TIME_LIMIT_EXCEEDED", () => {
  const adapter = new PistonAdapter({ baseUrl: "http://localhost:2000" });
  const parsed = adapter.transformPistonResponse({
    run: {
      stdout: "",
      stderr: "Process timed out after 2000ms",
      signal: "SIGKILL",
      code: null,
      output: "Process timed out after 2000ms",
    },
  }, 2050);

  assert.equal(parsed.status, "TIME_LIMIT_EXCEEDED");
  assert.equal(parsed.durationMs, 2050);
});
