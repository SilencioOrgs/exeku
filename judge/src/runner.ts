import { open, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { classifyRun, parseMeta, type IsolateCli } from "./isolate.ts";
import type { LanguageSpec } from "./languages.ts";
import type { CompileResult, RunRequest, RunResponse, TestRun } from "./types.ts";

export const MAX_STDOUT_BYTES = 1024 * 1024;
export const MAX_STDERR_BYTES = 64 * 1024;
const MAX_COMPILE_OUTPUT_BYTES = 64 * 1024;
const MAX_ARTIFACT_BYTES = 64 * 1024 * 1024;

const COMPILE_LIMITS = { timeMs: 20_000, wallTimeMs: 40_000, memoryKb: 768 * 1024, fileSizeKb: 64 * 1024, processes: 64 };
const RUN_FILE_SIZE_KB = 8 * 1024;

// Names the worker writes into the box. "~" is never allowed in a submitted file name, so these cannot collide.
const STDIN = "~stdin";
const STDOUT = "~stdout";
const STDERR = "~stderr";
const COMPILE_OUT = "~compile";
const WORKER_FILES = new Set([STDIN, STDOUT, STDERR, COMPILE_OUT]);

export interface RunnerDeps {
  cli: IsolateCli;
  spec: LanguageSpec;
  /** Private directory for meta files, outside every box. */
  workDir: string;
}

async function readCapped(path: string, maxBytes: number): Promise<string> {
  let handle;
  try {
    handle = await open(path, "r");
  } catch {
    return "";
  }
  try {
    const buffer = Buffer.alloc(maxBytes);
    const { bytesRead } = await handle.read(buffer, 0, maxBytes, 0);
    return buffer.subarray(0, bytesRead).toString("utf8");
  } finally {
    await handle.close();
  }
}

async function withBox<T>(cli: IsolateCli, boxId: number, fn: (boxDir: string) => Promise<T>): Promise<T> {
  const root = await cli.init(boxId);
  try {
    return await fn(join(root, "box"));
  } finally {
    await cli.cleanup(boxId);
  }
}

/** Box files after compiling: the binary or class files the runs need. */
export async function collectArtifacts(boxDir: string): Promise<Map<string, Buffer>> {
  const artifacts = new Map<string, Buffer>();
  let total = 0;
  for (const name of await readdir(boxDir)) {
    if (WORKER_FILES.has(name)) continue;
    const path = join(boxDir, name);
    const info = await stat(path);
    if (!info.isFile()) continue;
    total += info.size;
    if (total > MAX_ARTIFACT_BYTES) throw new Error("Compiled output is too large.");
    artifacts.set(name, await readFile(path));
  }
  return artifacts;
}

export async function runJob(request: RunRequest, boxId: number, deps: RunnerDeps): Promise<RunResponse> {
  const { cli, spec, workDir } = deps;
  const metaPath = join(workDir, `meta-${boxId}.txt`);
  let compile: CompileResult | null = null;
  let artifacts = new Map<string, Buffer>(request.files.map((file) => [file.name, Buffer.from(file.content, "utf8")]));

  if (spec.compile) {
    const compileArgv = spec.compile(request.files.map((file) => file.name));
    const compiled = await withBox(cli, boxId, async (boxDir) => {
      for (const [name, data] of artifacts) await writeFile(join(boxDir, name), data);
      await rm(metaPath, { force: true });
      await cli.run({ boxId, metaPath, limits: COMPILE_LIMITS, argv: compileArgv, dirs: spec.dirs, stdout: COMPILE_OUT, stderrToStdout: true });
      const outcome = classifyRun(parseMeta(await readCapped(metaPath, 16 * 1024)));
      const output = await readCapped(join(boxDir, COMPILE_OUT), MAX_COMPILE_OUTPUT_BYTES);
      const result: CompileResult = {
        ok: outcome.status === "SUCCESS",
        output: outcome.status === "TIME_LIMIT_EXCEEDED" ? `${output}\nCompilation took too long.`.trim() : output,
        timeMs: outcome.timeMs,
      };
      if (outcome.status === "INTERNAL_ERROR") throw new Error(outcome.message);
      return { result, files: result.ok ? await collectArtifacts(boxDir) : null };
    });
    compile = compiled.result;
    if (!compiled.files) return { compile, runs: [] };
    artifacts = compiled.files;
  }

  const runs: TestRun[] = [];
  const limits = {
    timeMs: request.timeLimitMs,
    wallTimeMs: Math.max(request.timeLimitMs * 3, request.timeLimitMs + 3000),
    memoryKb: request.memoryLimitKb + spec.memoryOverheadKb,
    fileSizeKb: RUN_FILE_SIZE_KB,
    processes: spec.processes,
  };
  const runArgv = spec.run(request.memoryLimitKb);

  // A fresh box per test: no files or cached memory carry over from the previous input.
  for (const stdin of request.stdins) {
    runs.push(
      await withBox(cli, boxId, async (boxDir) => {
        for (const [name, data] of artifacts) await writeFile(join(boxDir, name), data, { mode: 0o755 });
        await writeFile(join(boxDir, STDIN), stdin);
        await rm(metaPath, { force: true });
        await cli.run({ boxId, metaPath, limits, argv: runArgv, dirs: spec.dirs, stdin: STDIN, stdout: STDOUT, stderr: STDERR });
        const outcome = classifyRun(parseMeta(await readCapped(metaPath, 16 * 1024)));
        return {
          ...outcome,
          stdout: await readCapped(join(boxDir, STDOUT), MAX_STDOUT_BYTES),
          stderr: await readCapped(join(boxDir, STDERR), MAX_STDERR_BYTES),
        };
      })
    );
  }
  return { compile, runs };
}
