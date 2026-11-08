import {
  type IExecutionAdapter,
  type ExecutionRequest,
  type ExecutionResult,
  type ExecutionStatus,
  type SandboxHealth,
  type ExecutionLanguage,
  SUPPORTED_EXECUTION_LANGUAGES,
} from "@/types/execution";
import { QueueFullError } from "@/lib/execution/queue";

/** Talks to the Exeku judge worker in `judge/` (isolate sandboxes). See judge/README.md. */

const MAIN_FILE: Record<ExecutionLanguage, string> = {
  python: "main.py",
  java: "Main.java",
  cpp: "main.cpp",
  c: "main.c",
};

const DEFAULT_TIME_LIMIT_MS = 3000;
const DEFAULT_MEMORY_LIMIT_KB = 128000;

export interface ExekuJudgeAdapterOptions {
  baseUrl?: string;
  token?: string;
  fetchImpl?: typeof fetch;
}

interface WorkerRun {
  status: string;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  timeMs: number;
  memoryKb: number;
  message?: string;
}

export interface WorkerResponse {
  compile: { ok: boolean; output: string; timeMs: number } | null;
  runs: WorkerRun[];
}

const RUN_STATUSES: ExecutionStatus[] = ["SUCCESS", "RUNTIME_ERROR", "TIME_LIMIT_EXCEEDED", "MEMORY_LIMIT_EXCEEDED", "INTERNAL_ERROR"];

export class ExekuJudgeAdapter implements IExecutionAdapter {
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options?: ExekuJudgeAdapterOptions) {
    this.baseUrl = (options?.baseUrl || process.env.JUDGE_SERVICE_URL || "http://localhost:4000").replace(/\/$/, "");
    this.token = options?.token ?? process.env.JUDGE_TOKEN ?? "";
    this.fetchImpl = options?.fetchImpl ?? fetch;
  }

  buildPayload(request: ExecutionRequest, stdins: string[]) {
    const main = MAIN_FILE[request.language];
    return {
      language: request.language,
      files: [
        { name: main, content: request.sourceCode },
        ...(request.files ?? []).filter((file) => file.name !== main),
      ],
      stdins,
      timeLimitMs: request.timeLimitMs || DEFAULT_TIME_LIMIT_MS,
      memoryLimitKb: request.memoryLimitKb || DEFAULT_MEMORY_LIMIT_KB,
    };
  }

  /** One result per stdin, in order. A compile error is reported once per input so callers can stay per-test. */
  transformResponse(data: WorkerResponse, count: number): ExecutionResult[] {
    if (data.compile && !data.compile.ok) {
      const result: ExecutionResult = {
        status: "COMPILATION_ERROR",
        exitCode: null,
        stdout: "",
        stderr: "",
        compilerOutput: data.compile.output || "Compilation failed.",
        durationMs: data.compile.timeMs,
      };
      return Array.from({ length: count }, () => result);
    }
    if (!Array.isArray(data.runs) || data.runs.length !== count) {
      return Array.from({ length: count }, () => this.failure("INTERNAL_ERROR", "The judge returned the wrong number of results."));
    }
    return data.runs.map((run) => {
      const status = RUN_STATUSES.includes(run.status as ExecutionStatus) ? (run.status as ExecutionStatus) : "INTERNAL_ERROR";
      const note = status !== "SUCCESS" && run.message && !run.stderr ? run.message : "";
      return {
        status,
        exitCode: run.exitCode,
        stdout: run.stdout ?? "",
        stderr: run.stderr || note,
        compilerOutput: data.compile?.output || undefined,
        durationMs: run.timeMs,
        memoryUsedKb: run.memoryKb,
        error: status === "INTERNAL_ERROR" ? run.message : undefined,
      };
    });
  }

  private failure(status: ExecutionStatus, message: string, error?: string): ExecutionResult {
    return { status, exitCode: null, stdout: "", stderr: message, durationMs: 0, error: error ?? message };
  }

  async execute(request: ExecutionRequest): Promise<ExecutionResult> {
    const [result] = await this.executeBatch(request, [request.stdin ?? ""]);
    return result;
  }

  async executeBatch(request: ExecutionRequest, stdins: string[]): Promise<ExecutionResult[]> {
    const timeLimit = request.timeLimitMs || DEFAULT_TIME_LIMIT_MS;
    // Compile time plus every run at its wall-clock cap, plus time waiting in the worker's queue.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 60_000 + stdins.length * (timeLimit * 3 + 1000));
    const fail = (status: ExecutionStatus, message: string, error?: string) => stdins.map(() => this.failure(status, message, error));

    try {
      const res = await this.fetchImpl(`${this.baseUrl}/v1/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.token}` },
        body: JSON.stringify(this.buildPayload(request, stdins)),
        signal: controller.signal,
      });
      if (res.status === 429) throw new QueueFullError("The judge is busy. Please retry in a few seconds.");
      if (res.status === 401) return fail("INTERNAL_ERROR", "The judge rejected the token. Set the same JUDGE_TOKEN in .env.local and on the judge.");
      if (!res.ok) {
        const text = await res.text();
        return fail("INTERNAL_ERROR", `The judge returned HTTP ${res.status}.`, text);
      }
      return this.transformResponse((await res.json()) as WorkerResponse, stdins.length);
    } catch (err: unknown) {
      if (err instanceof QueueFullError) throw err;
      const message = err instanceof Error ? err.message : String(err);
      if (controller.signal.aborted) return fail("INTERNAL_ERROR", "The judge took too long to answer.", message);
      return fail("SERVICE_UNAVAILABLE", `The Exeku judge is not reachable at ${this.baseUrl}. Start it (see judge/README.md).`, message);
    } finally {
      clearTimeout(timer);
    }
  }

  async checkHealth(): Promise<SandboxHealth> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2000);
    try {
      const res = await this.fetchImpl(`${this.baseUrl}/v1/health`, { signal: controller.signal });
      if (!res.ok) return { isAvailable: false, engine: "Exeku judge (unreachable)", supportedLanguages: [], error: `HTTP ${res.status}` };
      const data = (await res.json()) as { version?: string; languages?: string[] };
      const languages = SUPPORTED_EXECUTION_LANGUAGES.filter((lang) => data.languages?.includes(lang));
      return { isAvailable: languages.length > 0, engine: "Exeku judge (isolate)", version: data.version, supportedLanguages: languages };
    } catch (err: unknown) {
      return { isAvailable: false, engine: "Exeku judge (offline)", supportedLanguages: [], error: err instanceof Error ? err.message : String(err) };
    } finally {
      clearTimeout(timer);
    }
  }
}
