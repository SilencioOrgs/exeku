#!/usr/bin/env node
// TEST FIXTURE ONLY. Mimics the isolate CLI (box dirs, meta files, exit codes) so the judge
// worker's file handling and verdict flow can be tested without root. It does NOT sandbox
// anything and only ever runs the tiny programs the tests write. Never point the worker at it.
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.env.FAKE_ISOLATE_ROOT;
const args = process.argv.slice(2);
const split = args.indexOf("--");
const flags = split === -1 ? args : args.slice(0, split);
const argv = split === -1 ? [] : args.slice(split + 1);
const opt = (name) => flags.find((f) => f.startsWith(`--${name}=`))?.slice(name.length + 3);
const boxDir = join(root, opt("box-id") ?? "0");
const box = join(boxDir, "box");

if (flags.includes("--init")) {
  mkdirSync(box, { recursive: true });
  process.stdout.write(`${boxDir}\n`);
  process.exit(0);
}
if (flags.includes("--cleanup")) {
  rmSync(boxDir, { recursive: true, force: true });
  process.exit(0);
}

const started = Date.now();
const stdinFile = opt("stdin");
const result = spawnSync(argv[0], argv.slice(1), {
  cwd: box,
  input: stdinFile ? readFileSync(join(box, stdinFile)) : "",
  timeout: Number(opt("time")) * 1000,
  maxBuffer: 64 * 1024 * 1024,
});
const seconds = ((Date.now() - started) / 1000).toFixed(3);
const out = result.stdout ?? Buffer.alloc(0);
const err = result.stderr ?? Buffer.alloc(0);
writeFileSync(join(box, opt("stdout")), flags.includes("--stderr-to-stdout") ? Buffer.concat([out, err]) : out);
if (opt("stderr")) writeFileSync(join(box, opt("stderr")), err);

const meta = [`time:${seconds}`, `time-wall:${seconds}`, "cg-mem:1024"];
if (result.error?.code === "ETIMEDOUT") meta.push("status:TO", "killed:1", "message:Time limit exceeded");
else if (result.signal) meta.push("status:SG", "exitsig:9", `message:Caught fatal signal`);
else if (result.status !== 0) meta.push("status:RE", `exitcode:${result.status}`, `message:Exited with error status ${result.status}`);
else meta.push("exitcode:0");
writeFileSync(opt("meta"), `${meta.join("\n")}\n`);
process.exit(meta.some((line) => line.startsWith("status:")) ? 1 : 0);
