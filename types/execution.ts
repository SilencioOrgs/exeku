/**
 * EXEKU — CODE EXECUTION TYPES & CONTRACTS
 */

export type ExecutionLanguage = "python" | "java" | "cpp" | "c";

export const SUPPORTED_EXECUTION_LANGUAGES: readonly ExecutionLanguage[] = [
  "python",
  "java",
  "cpp",
  "c",
] as const;

export type ExecutionStatus =
  | "SUCCESS"
  | "COMPILATION_ERROR"
  | "RUNTIME_ERROR"
  | "TIME_LIMIT_EXCEEDED"
  | "MEMORY_LIMIT_EXCEEDED"
  | "SERVICE_UNAVAILABLE"
  | "INTERNAL_ERROR";

export interface ExecutionRequest {
  language: ExecutionLanguage;
  sourceCode: string;
  stdin?: string;
  timeLimitMs?: number; // default 3000ms
  memoryLimitKb?: number; // default 128000KB
}

export interface ExecutionResult {
  status: ExecutionStatus;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  compilerOutput?: string;
  durationMs: number;
  memoryUsedKb?: number;
  error?: string;
}

export interface SandboxHealth {
  isAvailable: boolean;
  engine: string;
  version?: string;
  supportedLanguages: ExecutionLanguage[];
  error?: string;
}

export interface IExecutionAdapter {
  execute(request: ExecutionRequest): Promise<ExecutionResult>;
  checkHealth(): Promise<SandboxHealth>;
}
