import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { timingSafeEqual } from "node:crypto";
import type { IsolateCli, SandboxQuota } from "./isolate.ts";
import type { LanguageSpec } from "./languages.ts";
import { BoxPool, JobAbortedError, QueueFullError } from "./pool.ts";
import { runJob } from "./runner.ts";
import type { Language } from "./types.ts";
import { validateRunRequest } from "./validate.ts";

export const JUDGE_VERSION = "1.0.0";
export const MIN_JUDGE_TOKEN_LENGTH = 16;
const MAX_BODY_BYTES = 10 * 1024 * 1024;

export interface JudgeAppOptions {
  token: string;
  specs: Partial<Record<Language, LanguageSpec>>;
  cli: IsolateCli;
  pool: BoxPool;
  workDir: string;
  quota?: SandboxQuota;
  log?: (message: string) => void;
}

function send(res: ServerResponse, status: number, body: unknown, close = false) {
  if (res.writableEnded) return;
  const headers: Record<string, string> = { "content-type": "application/json", "cache-control": "no-store" };
  if (close) headers.connection = "close";
  res.writeHead(status, headers);
  res.end(JSON.stringify(body));
}

function authorized(req: IncomingMessage, token: string): boolean {
  if (token.length < MIN_JUDGE_TOKEN_LENGTH) return false;
  const header = req.headers.authorization ?? "";
  if (!header.startsWith("Bearer ")) return false;
  const given = Buffer.from(header.slice(7));
  const expected = Buffer.from(token);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    let settled = false;
    req.on("data", (chunk: Buffer) => {
      if (settled) return;
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        settled = true;
        chunks.length = 0;
        req.pause();
        reject(new Error("too large"));
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (!settled) {
        settled = true;
        resolve(Buffer.concat(chunks).toString("utf8"));
      }
    });
    req.on("error", (err) => {
      if (!settled) {
        settled = true;
        reject(err);
      }
    });
  });
}

export function createJudgeServer(options: JudgeAppOptions): Server {
  const { token, specs, cli, pool, workDir, quota, log = () => {} } = options;
  if (!token || token.length < MIN_JUDGE_TOKEN_LENGTH) {
    throw new Error(`Judge token must be at least ${MIN_JUDGE_TOKEN_LENGTH} characters.`);
  }

  return createServer(async (req, res) => {
    try {
      if (req.method === "GET" && req.url === "/v1/health") {
        return send(res, 200, { ok: true, engine: "exeku-judge", version: JUDGE_VERSION, languages: Object.keys(specs), queue: pool.stats });
      }
      if (req.method !== "POST" || req.url !== "/v1/run") return send(res, 404, { error: "Not found." });
      if (!authorized(req, token)) return send(res, 401, { error: "Missing or wrong judge token." });

      let body: unknown;
      try {
        body = JSON.parse(await readBody(req));
      } catch (err) {
        const tooLarge = err instanceof Error && err.message === "too large";
        return send(res, tooLarge ? 413 : 400, { error: tooLarge ? "Request is too large." : "Invalid JSON." }, tooLarge);
      }

      const validation = validateRunRequest(body, specs);
      if (!validation.ok) return send(res, 400, { error: validation.error });
      const request = validation.request;
      const spec = specs[request.language]!;

      const controller = new AbortController();
      const onClose = () => {
        if (!res.writableFinished) controller.abort();
      };
      res.on("close", onClose);

      const started = Date.now();
      try {
        const result = await pool.use(
          (boxId) => runJob(request, boxId, { cli, spec, workDir, quota, signal: controller.signal }),
          controller.signal,
        );
        log(`${request.language} ${request.stdins.length} input(s) in ${Date.now() - started}ms`);
        return send(res, 200, result);
      } finally {
        res.off("close", onClose);
      }
    } catch (err) {
      if (err instanceof JobAbortedError) return;
      if (err instanceof QueueFullError) return send(res, 429, { error: err.message });
      log(`error: ${err instanceof Error ? err.message : String(err)}`);
      // Never echo internals to the caller; the log has the details.
      return send(res, 500, { error: "The judge failed to run this submission." });
    }
  });
}
