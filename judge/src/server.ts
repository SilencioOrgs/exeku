import { mkdtemp, rm } from "node:fs/promises";
import { cpus, tmpdir } from "node:os";
import { join } from "node:path";
import { createJudgeServer } from "./app.ts";
import { createIsolateCli } from "./isolate.ts";
import { buildLanguageSpecs, detectToolchain } from "./languages.ts";
import { BoxPool } from "./pool.ts";

const env = process.env;
const token = env.JUDGE_TOKEN ?? "";
if (token.length < 16) {
  console.error("Set JUDGE_TOKEN to a random secret of at least 16 characters (openssl rand -hex 32).");
  process.exit(1);
}

const host = env.JUDGE_HOST || "127.0.0.1";
const port = Number(env.JUDGE_PORT || 4000);
const concurrency = Math.max(1, Number(env.JUDGE_CONCURRENCY) || cpus().length);
const rawQueue = env.JUDGE_MAX_QUEUE;
const maxWaiting = rawQueue !== undefined && rawQueue !== "" && Number.isFinite(Number(rawQueue)) ? Math.max(0, Math.floor(Number(rawQueue))) : 100;
const firstBoxId = Number(env.JUDGE_FIRST_BOX_ID || 0);

const cli = createIsolateCli(env.ISOLATE_BIN || "isolate");
const specs = buildLanguageSpecs(detectToolchain());
const ownsTempDir = !env.RUNTIME_DIRECTORY;
const workDir = env.RUNTIME_DIRECTORY || (await mkdtemp(join(tmpdir(), "exeku-judge-")));

// Boxes left over from a crash would make --init fail later.
for (let i = 0; i < concurrency; i++) await cli.cleanup(firstBoxId + i);

const pool = new BoxPool(concurrency, maxWaiting, firstBoxId);
const server = createJudgeServer({ token, specs, cli, pool, workDir, log: (message) => console.log(message) });

server.listen(port, host, () => {
  console.log(`exeku-judge listening on http://${host}:${port} with ${concurrency} sandbox(es)`);
  console.log(`languages: ${Object.keys(specs).join(", ") || "none found, install the compilers"}`);
});

const stop = () => {
  server.close(() => {
    const cleanup = ownsTempDir ? rm(workDir, { recursive: true, force: true }).catch(() => {}) : Promise.resolve();
    void cleanup.finally(() => process.exit(0));
  });
};
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
