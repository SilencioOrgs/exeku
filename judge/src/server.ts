import { mkdtemp, rm } from "node:fs/promises";
import { cpus, tmpdir } from "node:os";
import { join } from "node:path";
import { createJudgeServer, MIN_JUDGE_TOKEN_LENGTH } from "./app.ts";
import { createIsolateCli, type SandboxQuota } from "./isolate.ts";
import { buildLanguageSpecs, detectToolchain } from "./languages.ts";
import { BoxPool } from "./pool.ts";

const env = process.env;
const token = env.JUDGE_TOKEN ?? "";
if (token.length < MIN_JUDGE_TOKEN_LENGTH) {
  console.error(`Set JUDGE_TOKEN to a random secret of at least ${MIN_JUDGE_TOKEN_LENGTH} characters (openssl rand -hex 32).`);
  process.exit(1);
}

const host = env.JUDGE_HOST || "127.0.0.1";
const rawPort = Number(env.JUDGE_PORT || 4000);
const port = Number.isInteger(rawPort) && rawPort > 0 && rawPort <= 65535 ? rawPort : 4000;
const rawConcurrency = Number(env.JUDGE_CONCURRENCY);
const concurrency = Number.isFinite(rawConcurrency) && rawConcurrency >= 1 ? Math.floor(rawConcurrency) : cpus().length;
const rawQueue = env.JUDGE_MAX_QUEUE;
const maxWaiting = rawQueue !== undefined && rawQueue !== "" && Number.isFinite(Number(rawQueue)) ? Math.max(0, Math.floor(Number(rawQueue))) : 100;
const rawFirstBox = Number(env.JUDGE_FIRST_BOX_ID || 0);
const firstBoxId = Number.isInteger(rawFirstBox) && rawFirstBox >= 0 ? rawFirstBox : 0;

let quota: SandboxQuota | undefined;
if (env.JUDGE_BOX_QUOTA) {
  const [b, i] = env.JUDGE_BOX_QUOTA.split(",").map(Number);
  if (Number.isInteger(b) && b > 0 && Number.isInteger(i) && i > 0) {
    quota = { blocks: b, inodes: i };
  } else {
    console.error("Invalid JUDGE_BOX_QUOTA (expected '<blocks>,<inodes>', e.g. '16384,512').");
    process.exit(1);
  }
}

const cli = createIsolateCli(env.ISOLATE_BIN || "isolate");
const specs = buildLanguageSpecs(detectToolchain());
const ownsTempDir = !env.RUNTIME_DIRECTORY;
const workDir = env.RUNTIME_DIRECTORY || (await mkdtemp(join(tmpdir(), "exeku-judge-")));

// Boxes left over from a crash would make --init fail later.
for (let i = 0; i < concurrency; i++) await cli.cleanup(firstBoxId + i);

const pool = new BoxPool(concurrency, maxWaiting, firstBoxId);
const server = createJudgeServer({ token, specs, cli, pool, workDir, quota, log: (message) => console.log(message) });

server.listen(port, host, () => {
  console.log(`exeku-judge listening on http://${host}:${port} with ${concurrency} sandbox(es)`);
  if (host !== "127.0.0.1" && host !== "::1" && host !== "localhost") {
    console.warn("WARNING: exeku-judge is bound to a non-loopback address over plain HTTP. Put it behind TLS/HTTPS or a private tunnel so JUDGE_TOKEN is never sent in plaintext.");
  }
  console.log(`languages: ${Object.keys(specs).join(", ") || "none found, install the compilers"}`);
});

const stop = () => {
  server.close(() => {
    const cleanup = ownsTempDir ? rm(workDir, { recursive: true, force: true }).catch(() => {}) : Promise.resolve();
    void cleanup.finally(() => process.exit(0));
  });
  server.closeIdleConnections?.();
};
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
