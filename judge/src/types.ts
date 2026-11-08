export type Language = "python" | "java" | "cpp" | "c";

export const LANGUAGES: readonly Language[] = ["python", "java", "cpp", "c"];

export type RunStatus =
  | "SUCCESS"
  | "RUNTIME_ERROR"
  | "TIME_LIMIT_EXCEEDED"
  | "MEMORY_LIMIT_EXCEEDED"
  | "INTERNAL_ERROR";

export interface SourceFile {
  name: string;
  content: string;
}

/** One submission: compile once, then run every stdin in a fresh sandbox. */
export interface RunRequest {
  language: Language;
  files: SourceFile[];
  stdins: string[];
  timeLimitMs: number;
  memoryLimitKb: number;
}

export interface CompileResult {
  ok: boolean;
  output: string;
  timeMs: number;
}

export interface TestRun {
  status: RunStatus;
  exitCode: number | null;
  signal: number | null;
  stdout: string;
  stderr: string;
  timeMs: number;
  wallTimeMs: number;
  memoryKb: number;
  message?: string;
}

export interface RunResponse {
  compile: CompileResult | null;
  runs: TestRun[];
}
