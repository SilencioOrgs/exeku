import { constants as fsConstants } from "node:fs";
import { lstat, open, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { classifyRun, parseMeta, type IsolateCli } from "./isolate.ts";
import type { LanguageSpec } from "./languages.ts";
import { JobAbortedError } from "./pool.ts";
import type { CompileResult, Language, RunRequest, RunResponse, RunStatus, TestRun } from "./types.ts";

export const MAX_STDOUT_BYTES = 256 * 1024;
export const MAX_STDERR_BYTES = 64 * 1024;
const MAX_COMPILE_OUTPUT_BYTES = 64 * 1024;
export const MAX_ARTIFACT_BYTES = 16 * 1024 * 1024;
export const MAX_BATCH_WALL_MS = 90_000;
const SAFE_READ_FLAGS = fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW ?? 0) | (fsConstants.O_NONBLOCK ?? 0);

const COMPILE_LIMITS = { timeMs: 20_000, wallTimeMs: 40_000, memoryKb: 768 * 1024, fileSizeKb: 16 * 1024, processes: 64 };
const RUN_FILE_SIZE_KB = 2 * 1024;

// Names the worker writes into the box. "~" is never allowed in a submitted file name, so these cannot collide.
const STDIN = "~stdin";
const STDOUT = "~stdout";
const STDERR = "~stderr";
const COMPILE_OUT = "~compile";
const WORKER_FILES = new Set([STDIN, STDOUT, STDERR, COMPILE_OUT]);

export class ArtifactTooLargeError extends Error {}

export interface RunnerDeps {
  cli: IsolateCli;
  spec: LanguageSpec;
  /** Private directory for meta files, outside every box. */
  workDir: string;
  signal?: AbortSignal;
  maxBatchWallMs?: number;
}

/** Reads at most maxBytes from a regular file without following symlinks or blocking on FIFOs. */
async function readRegularFile(path: string, maxBytes: number): Promise<Buffer | null> {
  let handle;
  try {
    handle = await open(path, SAFE_READ_FLAGS);
    const info = await handle.stat();
    if (!info.isFile()) return null;
    const toRead = Math.min(maxBytes, info.size);
    if (toRead <= 0) return Buffer.alloc(0);
    const buffer = Buffer.alloc(toRead);
    const { bytesRead } = await handle.read(buffer, 0, toRead, 0);
    return buffer.subarray(0, bytesRead);
  } catch {
    return null;
  } finally {
    await handle?.close();
  }
}

async function readCapped(path: string, maxBytes: number): Promise<string> {
  const data = await readRegularFile(path, maxBytes);
  return data ? data.toString("utf8") : "";
}

async function withBox<T>(cli: IsolateCli, boxId: number, fn: (boxDir: string) => Promise<T>): Promise<T> {
  const root = await cli.init(boxId);
  try {
    return await fn(join(root, "box"));
  } finally {
    await cli.cleanup(boxId);
  }
}

/** The JVM stops itself at its heap limit, before the sandbox's memory limit can, and exits with an error. */
export function finalStatus(language: Language, status: RunStatus, stderr: string): RunStatus {
  return language === "java" && status === "RUNTIME_ERROR" && stderr.includes("java.lang.OutOfMemoryError") ? "MEMORY_LIMIT_EXCEEDED" : status;
}

/** Box files after compiling: the binary or class files the runs need. */
export async function collectArtifacts(boxDir: string): Promise<Map<string, Buffer>> {
  const artifacts = new Map<string, Buffer>();
  let total = 0;
  for (const name of await readdir(boxDir)) {
    if (WORKER_FILES.has(name)) continue;
    const path = join(boxDir, name);
    const info = await lstat(path);
    if (!info.isFile()) continue;
    total += info.size;
    if (total > MAX_ARTIFACT_BYTES) throw new ArtifactTooLargeError("Compiled output is too large.");
    const data = await readRegularFile(path, info.size);
    if (data) artifacts.set(name, data);
  }
  return artifacts;
}

export async function runJob(request: RunRequest, boxId: number, deps: RunnerDeps): Promise<RunResponse> {
  const { cli, spec, workDir, signal, maxBatchWallMs = MAX_BATCH_WALL_MS } = deps;
  const metaPath = join(workDir, `meta-${boxId}.txt`);
  let compile: CompileResult | null = null;
  let artifacts = new Map<string, Buffer>(request.files.map((file) => [file.name, Buffer.from(file.content, "utf8")]));

  if (signal?.aborted) throw new JobAbortedError("Client disconnected.");

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
      if (!result.ok) return { result, files: null };
      try {
        return { result, files: await collectArtifacts(boxDir) };
      } catch (err) {
        if (err instanceof ArtifactTooLargeError) {
          return { result: { ok: false, output: err.message, timeMs: outcome.timeMs }, files: null };
        }
        throw err;
      }
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
  const batchDeadline = Date.now() + maxBatchWallMs;

  // A fresh box per test: no files or cached memory carry over from the previous input.
  for (const stdin of request.stdins) {
    if (signal?.aborted) throw new JobAbortedError("Client disconnected.");
    if (runs.length > 0 && Date.now() >= batchDeadline) {
      runs.push({
        status: "TIME_LIMIT_EXCEEDED",
        exitCode: null,
        signal: null,
        stdout: "",
        stderr: "",
        timeMs: request.timeLimitMs,
        wallTimeMs: 0,
        memoryKb: 0,
        message: "Batch wall-time limit exceeded across test cases.",
      });
      continue;
    }
    runs.push(
      await withBox(cli, boxId, async (boxDir) => {
        for (const [name, data] of artifacts) await writeFile(join(boxDir, name), data, { mode: 0o755 });
        await writeFile(join(boxDir, STDIN), stdin);
        await rm(metaPath, { force: true });
        await cli.run({ boxId, metaPath, limits, argv: runArgv, dirs: spec.dirs, stdin: STDIN, stdout: STDOUT, stderr: STDERR });
        const outcome = classifyRun(parseMeta(await readCapped(metaPath, 16 * 1024)));
        const stderr = await readCapped(join(boxDir, STDERR), MAX_STDERR_BYTES);
        return {
          ...outcome,
          status: finalStatus(request.language, outcome.status, stderr),
          stdout: await readCapped(join(boxDir, STDOUT), MAX_STDOUT_BYTES),
          stderr,
        };
      })
    );
  }
  return { compile, runs };
}
