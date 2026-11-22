import test from "node:test";
import assert from "node:assert/strict";
import { chmodSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { buildRunArgs, classifyRun, createIsolateCli, parseMeta } from "../judge/src/isolate.ts";
import { buildLanguageSpecs, detectToolchain, linkedDirsOutside } from "../judge/src/languages.ts";
import { validateRunRequest } from "../judge/src/validate.ts";
import { BoxPool, QueueFullError } from "../judge/src/pool.ts";
import { createJudgeServer } from "../judge/src/app.ts";
import { collectArtifacts, finalStatus } from "../judge/src/runner.ts";
import { validateExecutionRequest } from "../lib/execution/validation.ts";
import { validateWorkspaceFilename } from "../components/app/workspace/file-tabs.tsx";

test("isolate meta files map to verdicts, memory before signals", () => {
  const verdict = (text) => classifyRun(parseMeta(text)).status;
  assert.equal(verdict("time:0.010\ntime-wall:0.020\ncg-mem:2048\nexitcode:0\n"), "SUCCESS");
  assert.equal(verdict("status:TO\nkilled:1\ntime:2.500\nmessage:Time limit exceeded\n"), "TIME_LIMIT_EXCEEDED");
  assert.equal(verdict("status:SG\nexitsig:9\ncg-oom-killed:1\ncg-mem:131072\n"), "MEMORY_LIMIT_EXCEEDED");
  assert.equal(verdict("status:RE\nexitcode:1\n"), "RUNTIME_ERROR");
  assert.equal(verdict("status:XX\nmessage:broken\n"), "INTERNAL_ERROR");
  assert.equal(verdict(""), "INTERNAL_ERROR", "a missing meta file is the judge's failure, not the student's");

  const output = classifyRun(parseMeta("status:SG\nexitsig:25\n"));
  assert.equal(output.status, "RUNTIME_ERROR");
  assert.match(output.message, /Output limit/);

  const ok = classifyRun(parseMeta("time:0.125\ntime-wall:0.300\ncg-mem:4096\nexitcode:0\n"));
  assert.deepEqual([ok.timeMs, ok.wallTimeMs, ok.memoryKb, ok.exitCode], [125, 300, 4096, 0]);
});

test("run arguments enforce limits and only allow threads when asked", () => {
  const base = { boxId: 3, metaPath: "/tmp/m", argv: ["./main"], stdin: "in", stdout: "out", stderr: "err" };
  const single = buildRunArgs({ ...base, limits: { timeMs: 2000, wallTimeMs: 6000, memoryKb: 131072, fileSizeKb: 8192, processes: 1 } });
  for (const flag of ["--cg", "--box-id=3", "--time=2.000", "--wall-time=6.000", "--cg-mem=131072", "--fsize=8192", "--stdin=in", "--stdout=out", "--stderr=err"]) {
    assert.ok(single.includes(flag), `missing ${flag}`);
  }
  assert.ok(!single.some((arg) => arg.startsWith("--processes")));
  assert.ok(!single.includes("--share-net"), "network stays off");
  assert.deepEqual(single.slice(-3), ["--run", "--", "./main"]);

  const jvm = buildRunArgs({ ...base, dirs: ["/etc/java-17-openjdk"], limits: { timeMs: 2000, wallTimeMs: 6000, memoryKb: 262144, fileSizeKb: 8192, processes: 64, quota: { blocks: 16384, inodes: 512 } } });
  assert.ok(jvm.includes("--processes=64"));
  assert.ok(jvm.includes("--dir=/etc/java-17-openjdk=/etc/java-17-openjdk:maybe"));
  assert.ok(jvm.includes("--quota=16384,512"));
});

test("createJudgeServer rejects empty or short tokens", () => {
  const dummyCli = { init: async () => "", run: async () => {}, cleanup: async () => {} };
  for (const badToken of ["", "short", "123456789012345"]) {
    assert.throws(
      () => createJudgeServer({ token: badToken, specs: {}, cli: dummyCli, pool: new BoxPool(1, 1), workDir: tmpdir() }),
      /at least 16/,
    );
  }
});

test("JDK config links into /etc are found so the sandbox can bind them", () => {
  const base = mkdtempSync(join(tmpdir(), "jdk-"));
  try {
    const etc = join(base, "etc") + sep;
    mkdirSync(join(etc, "java-17-openjdk", "security"), { recursive: true });
    writeFileSync(join(etc, "java-17-openjdk", "security", "java.security"), "");
    const conf = join(base, "jvm", "conf");
    mkdirSync(join(conf, "security"), { recursive: true });
    symlinkSync(join(etc, "java-17-openjdk", "security", "java.security"), join(conf, "security", "java.security"));
    symlinkSync(join(base, "missing"), join(conf, "dangling"));
    assert.deepEqual(linkedDirsOutside(conf, etc), [join(etc, "java-17-openjdk")]);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test("worker validation rejects reserved names and wrong entry files, clamps limits", () => {
  const specs = { python: { mainFile: "main.py" } };
  const ok = validateRunRequest({ language: "python", files: [{ name: "main.py", content: "" }], stdins: [""], timeLimitMs: 999999, memoryLimitKb: 1 }, specs);
  assert.equal(ok.ok, true);
  assert.equal(ok.request.timeLimitMs, 15000);
  assert.equal(ok.request.memoryLimitKb, 16 * 1024);

  const bad = (body) => validateRunRequest({ language: "python", files: [{ name: "main.py", content: "" }], stdins: [""], ...body }, specs).ok;
  assert.equal(bad({ files: [{ name: "main.py", content: "" }, { name: "~stdin", content: "" }] }), false, "the worker's own file names can never be submitted");
  assert.equal(bad({ files: [{ name: "main.py", content: "" }, { name: ".hidden.py", content: "" }] }), false);
  assert.equal(bad({ files: [{ name: "../main.py", content: "" }] }), false);
  assert.equal(bad({ files: [{ name: "util.py", content: "" }] }), false);
  assert.equal(bad({ stdins: [] }), false);
  assert.equal(bad({ language: "java" }), false, "a language whose compiler is missing is refused");
});

test("__init__.py is accepted by the editor, the site and the judge; dot files by none of them", () => {
  const files = (name) => [{ name: "main.py", content: "x" }, { name, content: "" }];
  const site = (name) => validateExecutionRequest({ language: "python", sourceCode: "x", files: files(name) });
  const judge = (name) => validateRunRequest({ language: "python", files: files(name), stdins: [""] }, { python: { mainFile: "main.py" } });
  const editor = (name) => validateWorkspaceFilename(name, "python", [{ name: "main.py", content: "x" }]);

  assert.equal(site("__init__.py").valid, true);
  assert.equal(judge("__init__.py").ok, true);
  assert.equal(editor("__init__.py"), null);

  assert.match(site(".hidden.py").error, /start with a dot/);
  assert.equal(judge(".hidden.py").ok, false);
  assert.match(editor(".hidden.py"), /start with a dot/);
});

test("compiled output keeps the student's __ files and drops exactly the worker's own", async () => {
  const box = mkdtempSync(join(tmpdir(), "box-"));
  try {
    for (const name of ["~stdin", "~stdout", "~stderr", "~compile", "__helper.py", "Main.class"]) writeFileSync(join(box, name), name);
    mkdirSync(join(box, "__pycache__"));
    assert.deepEqual([...(await collectArtifacts(box)).keys()].sort(), ["Main.class", "__helper.py"]);
  } finally {
    rmSync(box, { recursive: true, force: true });
  }
});

test("Java running out of heap is a memory verdict, and nothing else is changed by it", () => {
  const oom = 'Exception in thread "main" java.lang.OutOfMemoryError: Java heap space';
  assert.equal(finalStatus("java", "RUNTIME_ERROR", oom), "MEMORY_LIMIT_EXCEEDED");
  assert.equal(finalStatus("java", "RUNTIME_ERROR", "java.lang.NullPointerException"), "RUNTIME_ERROR");
  assert.equal(finalStatus("python", "RUNTIME_ERROR", oom), "RUNTIME_ERROR", "only the JVM reports it this way");
  assert.equal(finalStatus("java", "SUCCESS", oom), "SUCCESS", "a caught error in a program that finished is not a failure");
  assert.equal(finalStatus("java", "TIME_LIMIT_EXCEEDED", oom), "TIME_LIMIT_EXCEEDED");
});

test("box pool caps concurrency and refuses when the queue is full", async () => {
  const pool = new BoxPool(1, 1);
  let release;
  const first = pool.use(() => new Promise((resolve) => (release = resolve)));
  const second = pool.use(async (boxId) => boxId);
  await assert.rejects(pool.use(async () => 0), QueueFullError);
  release();
  await first;
  assert.equal(await second, 0, "the waiting job gets the freed box");
});

test("worker compiles once and runs every input in a fresh box (fake isolate)", async () => {
  const fake = fileURLToPath(new URL("./fixtures/fake-isolate.mjs", import.meta.url));
  chmodSync(fake, 0o755);
  const root = mkdtempSync(join(tmpdir(), "fake-isolate-"));
  const workDir = mkdtempSync(join(tmpdir(), "judge-work-"));
  process.env.FAKE_ISOLATE_ROOT = root;

  const specs = buildLanguageSpecs(detectToolchain());
  const server = createJudgeServer({ token: "x".repeat(32), specs, cli: createIsolateCli(fake), pool: new BoxPool(2, 10), workDir });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  const run = (body, token = "x".repeat(32)) =>
    fetch(`${url}/v1/run`, { method: "POST", headers: { authorization: `Bearer ${token}` }, body: JSON.stringify(body) }).then(async (res) => ({ status: res.status, body: await res.json() }));

  try {
    assert.equal((await run({}, "wrong")).status, 401);
    const health = await fetch(`${url}/v1/health`).then((res) => res.json());
    assert.equal(health.engine, "exeku-judge");

    if (specs.python) {
      const res = await run({ language: "python", files: [{ name: "main.py", content: "print(int(input()) * 2)\n" }], stdins: ["1\n", "21\n", "oops\n"] });
      assert.equal(res.status, 200);
      assert.equal(res.body.compile, null);
      assert.deepEqual(res.body.runs.map((r) => [r.status, r.stdout.trim()]), [["SUCCESS", "2"], ["SUCCESS", "42"], ["RUNTIME_ERROR", ""]]);
      assert.match(res.body.runs[2].stderr, /ValueError/);

      const leak = await run({ language: "python", files: [{ name: "main.py", content: "import os\nprint(sorted(os.listdir('.')))\nopen('left.txt','w').write('x')\n" }], stdins: ["", ""] });
      assert.ok(!leak.body.runs[1].stdout.includes("left.txt"), "files from one test never reach the next");
    }

    if (specs.cpp) {
      const ok = await run({ language: "cpp", files: [{ name: "main.cpp", content: "#include <iostream>\nint main(){int n;std::cin>>n;std::cout<<n+1;}\n" }], stdins: ["1", "41"] });
      assert.equal(ok.body.compile.ok, true);
      assert.deepEqual(ok.body.runs.map((r) => r.stdout), ["2", "42"]);

      const broken = await run({ language: "cpp", files: [{ name: "main.cpp", content: "int main( {" }], stdins: ["1"] });
      assert.equal(broken.body.compile.ok, false);
      assert.match(broken.body.compile.output, /error/);
      assert.deepEqual(broken.body.runs, [], "nothing runs after a compile error");
    }

    if (specs.java) {
      const java = await run({ language: "java", files: [{ name: "Main.java", content: "public class Main{public static void main(String[] a){System.out.println(new java.util.Scanner(System.in).nextInt()*2);}}" }], stdins: ["21"] });
      assert.equal(java.body.compile.ok, true, java.body.compile.output);
      assert.equal(java.body.runs[0].stdout.trim(), "42");
    }
  } finally {
    server.close();
    rmSync(root, { recursive: true, force: true });
    rmSync(workDir, { recursive: true, force: true });
  }
});

test("judge server returns clean 404, 400, 429, and redacted 500 responses", async () => {
  const token = "y".repeat(32);
  let releaseBox;
  const specs = buildLanguageSpecs({ python3: "/usr/bin/python3", gcc: null, gxx: null, javac: null, java: null, javaDirs: [] });
  const slowCli = {
    async init() {
      await new Promise((resolve) => { releaseBox = resolve; });
      throw new Error("secret internal host path /var/secret");
    },
    async run() {},
    async cleanup() {},
  };
  const workDir = mkdtempSync(join(tmpdir(), "judge-err-"));
  const server = createJudgeServer({ token, specs, cli: slowCli, pool: new BoxPool(1, 0), workDir });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  try {
    // 404 unknown route
    const notFound = await fetch(`${url}/v1/unknown`);
    assert.equal(notFound.status, 404);

    // 400 malformed JSON
    const badJson = await fetch(`${url}/v1/run`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: "{not json",
    });
    assert.equal(badJson.status, 400);

    // 429 QueueFullError while single box is busy, and redacted 500 on internal error
    const validBody = JSON.stringify({ language: "python", files: [{ name: "main.py", content: "print(1)" }], stdins: [""] });
    const firstPromise = fetch(`${url}/v1/run`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: validBody,
    });
    // Wait a tick for the first request to acquire the only box.
    await new Promise((r) => setTimeout(r, 25));
    const full = await fetch(`${url}/v1/run`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: validBody,
    });
    assert.equal(full.status, 429);

    releaseBox();
    const first = await firstPromise;
    assert.equal(first.status, 500);
    const firstBody = await first.json();
    assert.doesNotMatch(firstBody.error, /\/var\/secret/);
  } finally {
    server.close();
    rmSync(workDir, { recursive: true, force: true });
  }
});

test("runJob fast-fails remaining tests after 3 consecutive TLEs to prevent queue starvation", async () => {
  const { runJob } = await import("../judge/src/runner.ts");
  const root = mkdtempSync(join(tmpdir(), "tle-fast-"));
  const workDir = mkdtempSync(join(tmpdir(), "tle-work-"));
  const box = join(root, "box");
  let runsExecuted = 0;
  try {
    const specs = buildLanguageSpecs({ python3: "/usr/bin/python3", gcc: null, gxx: null, javac: null, java: null, javaDirs: [] });
    const tleCli = {
      async init() {
        mkdirSync(box, { recursive: true });
        return root;
      },
      async run(r) {
        runsExecuted++;
        writeFileSync(r.metaPath, "status:TO\nkilled:1\ntime:2.000\nmessage:Time limit exceeded\n");
        writeFileSync(join(box, r.stdout), "");
        if (r.stderr) writeFileSync(join(box, r.stderr), "");
      },
      async cleanup() {},
    };
    const res = await runJob(
      { language: "python", files: [{ name: "main.py", content: "while True: pass" }], stdins: ["1", "2", "3", "4", "5", "6"], timeLimitMs: 2000, memoryLimitKb: 131072 },
      0,
      { cli: tleCli, spec: specs.python, workDir },
    );
    assert.equal(runsExecuted, 3);
    assert.equal(res.runs.length, 6);
    assert.ok(res.runs.every((r) => r.status === "TIME_LIMIT_EXCEEDED"));
    assert.match(res.runs[5].message ?? "", /3 consecutive/);
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(workDir, { recursive: true, force: true });
  }
});
