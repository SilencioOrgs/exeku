import { execFile } from "node:child_process";
import type { RunStatus } from "./types.ts";

/** Wraps the isolate CLI (https://github.com/ioi/isolate, v2, cgroup v2). Arguments are passed as argv, never through a shell. */

export interface SandboxLimits {
  timeMs: number;
  wallTimeMs: number;
  memoryKb: number;
  /** Largest file the program may write, in KB. Caps output size. */
  fileSizeKb: number;
  processes: number;
}

export interface SandboxRun {
  boxId: number;
  metaPath: string;
  limits: SandboxLimits;
  argv: string[];
  dirs?: string[];
  stdin?: string;
  stdout: string;
  stderr?: string;
  stderrToStdout?: boolean;
}

const seconds = (ms: number) => (ms / 1000).toFixed(3);

export function buildRunArgs(run: SandboxRun): string[] {
  const { limits } = run;
  const args = [
    "--cg",
    `--box-id=${run.boxId}`,
    "--silent",
    `--meta=${run.metaPath}`,
    `--time=${seconds(limits.timeMs)}`,
    // Let a slow program run a little past the limit so the reported time is real.
    `--extra-time=${seconds(Math.min(1000, limits.timeMs / 2))}`,
    `--wall-time=${seconds(limits.wallTimeMs)}`,
    `--cg-mem=${limits.memoryKb}`,
    `--fsize=${limits.fileSizeKb}`,
    "--open-files=64",
    "--env=PATH=/usr/local/bin:/usr/bin:/bin",
    "--env=HOME=/box",
    "--env=LANG=C.UTF-8",
  ];
  if (limits.processes > 1) args.push(`--processes=${limits.processes}`);
  for (const dir of run.dirs ?? []) args.push(`--dir=${dir}=${dir}:maybe`);
  if (run.stdin) args.push(`--stdin=${run.stdin}`);
  args.push(`--stdout=${run.stdout}`);
  if (run.stderrToStdout) args.push("--stderr-to-stdout");
  else if (run.stderr) args.push(`--stderr=${run.stderr}`);
  args.push("--run", "--", ...run.argv);
  return args;
}

export function parseMeta(text: string): Record<string, string> {
  const meta: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const at = line.indexOf(":");
    if (at > 0) meta[line.slice(0, at)] = line.slice(at + 1).trim();
  }
  return meta;
}

const SIGXFSZ = 25;

export interface RunOutcome {
  status: RunStatus;
  exitCode: number | null;
  signal: number | null;
  timeMs: number;
  wallTimeMs: number;
  memoryKb: number;
  message?: string;
}

/** Turns isolate's meta file into a verdict. Memory is checked first: an OOM kill also looks like a signal. */
export function classifyRun(meta: Record<string, string>): RunOutcome {
  const num = (key: string) => (meta[key] === undefined ? null : Number(meta[key]));
  const outcome = {
    exitCode: num("exitcode"),
    signal: num("exitsig"),
    timeMs: Math.round((num("time") ?? 0) * 1000),
    wallTimeMs: Math.round((num("time-wall") ?? 0) * 1000),
    memoryKb: num("cg-mem") ?? num("max-rss") ?? 0,
  };
  const status = meta.status;
  if (Object.keys(meta).length === 0) return { ...outcome, status: "INTERNAL_ERROR", message: "The sandbox wrote no result." };
  if (status === "XX") return { ...outcome, status: "INTERNAL_ERROR", message: meta.message || "Sandbox internal error." };
  if (meta["cg-oom-killed"] !== undefined) return { ...outcome, status: "MEMORY_LIMIT_EXCEEDED", message: "Memory limit exceeded." };
  if (status === "TO") return { ...outcome, status: "TIME_LIMIT_EXCEEDED", message: meta.message || "Time limit exceeded." };
  if (status === "SG" && outcome.signal === SIGXFSZ) return { ...outcome, status: "RUNTIME_ERROR", message: "Output limit exceeded." };
  if (status === "SG" || status === "RE") return { ...outcome, status: "RUNTIME_ERROR", message: meta.message };
  return { ...outcome, status: "SUCCESS" };
}

export interface IsolateCli {
  init(boxId: number): Promise<string>;
  run(run: SandboxRun): Promise<void>;
  cleanup(boxId: number): Promise<void>;
}

function exec(bin: string, args: string[], timeoutMs: number): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    execFile(bin, args, { timeout: timeoutMs, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
      const code = error ? (typeof error.code === "number" ? error.code : -1) : 0;
      resolve({ code, stdout: String(stdout), stderr: String(stderr) });
    });
  });
}

export function createIsolateCli(bin = "isolate"): IsolateCli {
  return {
    async init(boxId) {
      let res = await exec(bin, ["--cg", `--box-id=${boxId}`, "--init"], 10_000);
      if (res.code !== 0) {
        await exec(bin, ["--cg", `--box-id=${boxId}`, "--cleanup"], 10_000);
        res = await exec(bin, ["--cg", `--box-id=${boxId}`, "--init"], 10_000);
      }
      if (res.code !== 0) throw new Error(`isolate --init failed: ${res.stderr.trim() || res.code}`);
      return res.stdout.trim();
    },
    async run(run) {
      // Exit 0 or 1 means the program ran (the meta file says how); 2 means isolate itself failed.
      const res = await exec(bin, buildRunArgs(run), run.limits.wallTimeMs + 10_000);
      if (res.code !== 0 && res.code !== 1) throw new Error(`isolate --run failed: ${res.stderr.trim() || res.code}`);
    },
    async cleanup(boxId) {
      let res = await exec(bin, ["--cg", `--box-id=${boxId}`, "--cleanup"], 10_000);
      if (res.code !== 0) {
        res = await exec(bin, ["--cg", `--box-id=${boxId}`, "--cleanup"], 10_000);
      }
      if (res.code !== 0) {
        console.error(`isolate --cleanup failed for box ${boxId}: ${res.stderr.trim() || res.code}`);
      }
    },
  };
}
