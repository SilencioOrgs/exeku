import {
  type IExecutionAdapter,
  type ExecutionRequest,
  type ExecutionResult,
  type SandboxHealth,
  type ExecutionLanguage,
  SUPPORTED_EXECUTION_LANGUAGES,
} from "@/types/execution";

export interface PistonAdapterOptions {
  baseUrl?: string;
  defaultTimeoutMs?: number;
}

export interface PistonPayload {
  language: string;
  version?: string;
  files: Array<{ name: string; content: string }>;
  stdin?: string;
  args?: string[];
  compile_timeout?: number;
  run_timeout?: number;
}

export interface PistonExecutionResponse {
  language?: string;
  version?: string;
  run: {
    stdout: string;
    stderr: string;
    code: number | null;
    signal?: string | null;
    output?: string;
  };
  compile?: {
    stdout: string;
    stderr: string;
    code: number | null;
    signal?: string | null;
    output?: string;
  };
  message?: string;
}

const LANGUAGE_MAP: Record<
  ExecutionLanguage,
  { pistonLang: string; filename: string; defaultVersion?: string }
> = {
  python: { pistonLang: "python", filename: "main.py", defaultVersion: "3.10.0" },
  java: { pistonLang: "java", filename: "Main.java", defaultVersion: "15.0.2" },
  cpp: { pistonLang: "c++", filename: "main.cpp", defaultVersion: "10.2.0" },
  c: { pistonLang: "c", filename: "main.c", defaultVersion: "10.2.0" },
};

export class PistonAdapter implements IExecutionAdapter {
  private readonly baseUrl: string;

  constructor(options?: PistonAdapterOptions) {
    this.baseUrl = (
      options?.baseUrl ||
      process.env.JUDGE_SERVICE_URL ||
      "http://localhost:2000"
    ).replace(/\/$/, "");
  }

  buildPistonPayload(request: ExecutionRequest): PistonPayload {
    const meta = LANGUAGE_MAP[request.language];
    const timeLimit = request.timeLimitMs || 3000;

    return {
      language: meta.pistonLang,
      version: meta.defaultVersion,
      files: [
        {
          name: meta.filename,
          content: request.sourceCode,
        },
      ],
      stdin: request.stdin || "",
      args: [],
      compile_timeout: 10000,
      run_timeout: timeLimit,
    };
  }

  transformPistonResponse(
    data: PistonExecutionResponse,
    durationMs: number
  ): ExecutionResult {
    // 1. Check for compilation errors
    if (data.compile && data.compile.code !== 0 && data.compile.code !== null) {
      return {
        status: "COMPILATION_ERROR",
        exitCode: data.compile.code,
        stdout: data.compile.stdout || "",
        stderr: data.compile.stderr || "",
        compilerOutput: data.compile.output || data.compile.stderr || "",
        durationMs,
      };
    }

    const run = data.run;

    // 2. Check for timeout (SIGKILL or explicit timeout message)
    if (
      run.signal === "SIGKILL" ||
      run.signal === "SIGTERM" ||
      (run.stderr && run.stderr.toLowerCase().includes("timed out"))
    ) {
      return {
        status: "TIME_LIMIT_EXCEEDED",
        exitCode: run.code,
        stdout: run.stdout || "",
        stderr: run.stderr || "Time limit exceeded",
        compilerOutput: data.compile?.output,
        durationMs,
      };
    }

    // 3. Check for runtime failure (exit code != 0)
    if (run.code !== 0 && run.code !== null) {
      return {
        status: "RUNTIME_ERROR",
        exitCode: run.code,
        stdout: run.stdout || "",
        stderr: run.stderr || "",
        compilerOutput: data.compile?.output,
        durationMs,
      };
    }

    // 4. Successful execution
    return {
      status: "SUCCESS",
      exitCode: 0,
      stdout: run.stdout || "",
      stderr: run.stderr || "",
      compilerOutput: data.compile?.output,
      durationMs,
    };
  }

  async execute(request: ExecutionRequest): Promise<ExecutionResult> {
    const payload = this.buildPistonPayload(request);
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const clientTimeout = setTimeout(
        () => controller.abort(),
        (request.timeLimitMs || 3000) + 5000
      );

      const res = await fetch(`${this.baseUrl}/api/v2/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(clientTimeout);

      if (!res.ok) {
        const text = await res.text();
        return {
          status: "INTERNAL_ERROR",
          exitCode: null,
          stdout: "",
          stderr: `Execution service returned HTTP ${res.status}: ${text}`,
          durationMs: Date.now() - startTime,
          error: text,
        };
      }

      const data = (await res.json()) as PistonExecutionResponse;
      const duration = Date.now() - startTime;
      return this.transformPistonResponse(data, duration);
    } catch (err: unknown) {
      const duration = Date.now() - startTime;
      const message = err instanceof Error ? err.message : String(err);

      if (message.includes("abort") || message.includes("timeout")) {
        return {
          status: "TIME_LIMIT_EXCEEDED",
          exitCode: null,
          stdout: "",
          stderr: "Execution timed out waiting for sandbox response.",
          durationMs: duration,
        };
      }

      return {
        status: "SERVICE_UNAVAILABLE",
        exitCode: null,
        stdout: "",
        stderr: `Sandbox execution service unavailable at ${this.baseUrl}. Please start the local Piston container.`,
        durationMs: duration,
        error: message,
      };
    }
  }

  async checkHealth(): Promise<SandboxHealth> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);

      const res = await fetch(`${this.baseUrl}/api/v2/runtimes`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        return {
          isAvailable: false,
          engine: "Piston v2 (Unreachable)",
          supportedLanguages: [],
          error: `HTTP ${res.status}`,
        };
      }

      return {
        isAvailable: true,
        engine: "Piston v2 Sandbox",
        supportedLanguages: [...SUPPORTED_EXECUTION_LANGUAGES],
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        isAvailable: false,
        engine: "Piston v2 (Offline)",
        supportedLanguages: [],
        error: message,
      };
    }
  }
}
