import test from "node:test";
import assert from "node:assert/strict";
import { validateExecutionRequest } from "../lib/execution/validation.ts";
import { ExekuJudgeAdapter } from "../lib/execution/exeku-judge-adapter.ts";
import { MockSandboxAdapter } from "./fixtures/mock-adapter.ts";

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

test("code safety guard blocks OS deletion, shell execution, and destructive syscalls across all languages and companion files", async () => {
  const { checkCodeSafety } = await import("../lib/execution/code-safety.ts");
  const { LEARN_CHAPTERS } = await import("../lib/learn/curriculum.ts");
  const { LANGUAGE_DOC_TOPICS } = await import("../lib/learn/docs.ts");

  const malicious = [
    ["python", 'import os\nos.system("rm -rf /")'],
    ["python", 'import shutil\nshutil.rmtree("/")'],
    ["python", 'import subprocess\nsubprocess.run(["rm", "-rf", "/"])'],
    ["python", '__import__("os").system("id")'],
    ["python", 'open("/etc/passwd").read()'],
    ["python", 'open("hack.txt", "w").write("x")'],
    ["python", 'eval("1+1")'],
    ["cpp", '#include <cstdlib>\nint main(){ system("rm -rf /"); }'],
    ["cpp", '#include <filesystem>\nint main(){ std::filesystem::remove_all("/"); }'],
    ["cpp", '#include <unistd.h>\nint main(){ fork(); }'],
    ["c", '#include <stdio.h>\nint main(){ remove("/etc/passwd"); }'],
    ["c", '#include <stdio.h>\nint main(){ fopen("/etc/shadow", "r"); }'],
    ["java", 'public class Main { public static void main(String[] a) throws Exception { Runtime.getRuntime().exec("rm -rf /"); } }'],
    ["java", 'import java.nio.file.*; public class Main { void f() throws Exception { Files.delete(Path.of("/")); } }'],
    ["java", 'public class Main { void f() { new ProcessBuilder("sh", "-c", "rm -rf /"); } }'],
    ["cpp", 'const char* s = R"( " /* )";\nint main(){ system("id"); }\n// */'],
    ["java", 'public class Main { String s = """\n"" /*\n"""; void f() throws Exception { Runtime.getRuntime().exec("id"); }\n// */ }'],
  ];

  for (const [language, sourceCode] of malicious) {
    const res = validateExecutionRequest({ language, sourceCode });
    assert.equal(res.valid, false, `Expected ${language} payload to be blocked: ${sourceCode}`);
    assert.match(res.error, /blocked/i);
  }

  // Companion file containing suspicious code is also blocked.
  const companionAttack = validateExecutionRequest({
    language: "python",
    sourceCode: "import helper\nprint(helper.run())\n",
    files: [
      { name: "main.py", content: "import helper\nprint(helper.run())\n" },
      { name: "helper.py", content: "import os\ndef run():\n    os.system('rm -rf /')\n" },
    ],
  });
  assert.equal(companionAttack.valid, false);
  assert.match(companionAttack.error, /helper\.py/);

  // Legitimate competitive programming code and comments must NOT be false-positived.
  const safeSamples = [
    ["python", '# Do not use os.system("rm -rf /") in solutions\nimport sys, math, collections, heapq, re\npat = re.compile(r"\\d+")\ndef eval(node): return node\ndef shred(s): return s.split()\ndata = open(0).read().split()\nprint(sum(map(int, data)))\n'],
    ["cpp", '// Never call system("rm -rf /")\n#include <iostream>\n#include <vector>\n#include <algorithm>\nstruct Trie { void remove(const char*) {} };\nint main(){ const int MAXN = 200\'005; // do not call system("rm -rf /")\nint shred = 0; Trie trie; trie.remove("abc"); std::vector<int> v={1,2,3}; v.erase(std::remove(v.begin(), v.end(), 2), v.end()); std::cout << v.size() + shred + MAXN; }\n'],
    ["c", '/* Safe C I/O */\n#include <stdio.h>\nint main(void){ int a,b; if (scanf("%d %d", &a, &b)==2) printf("%d\\n", a+b); return 0; }\n'],
    ["java", '// Safe Java I/O\nimport java.io.BufferedReader;\nimport java.io.InputStreamReader;\npublic class Main { public static void main(String[] a) throws Exception { BufferedReader br = new BufferedReader(new InputStreamReader(System.in)); System.out.println(br.readLine()); } }\n'],
  ];

  for (const [language, sourceCode] of safeSamples) {
    const res = validateExecutionRequest({ language, sourceCode });
    assert.equal(res.valid, true, `Expected safe ${language} code to pass, got: ${res.valid ? "" : res.error}`);
  }

  // Every built-in Learn example and Docs snippet must pass the safety guard.
  for (const ch of LEARN_CHAPTERS) {
    for (const lang of ["python", "java", "cpp", "c"]) {
      const check = checkCodeSafety(lang, ch.lessons[lang].exampleCode);
      assert.equal(check.safe, true, `Learn chapter ${ch.id}:${lang} tripped safety guard: ${check.safe ? "" : check.message}`);
    }
  }
  for (const topic of LANGUAGE_DOC_TOPICS) {
    for (const lang of ["python", "java", "cpp", "c"]) {
      const check = checkCodeSafety(lang, topic.byLanguage[lang].codeSnippet);
      assert.equal(check.safe, true, `Doc topic ${topic.id}:${lang} tripped safety guard: ${check.safe ? "" : check.message}`);
    }
  }
});

