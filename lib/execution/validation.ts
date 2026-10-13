import {
  type ExecutionRequest,
  type ExecutionLanguage,
  SUPPORTED_EXECUTION_LANGUAGES,
} from "@/types/execution";

export const MAX_SOURCE_LENGTH = 64 * 1024; // 64KB
export const MAX_STDIN_LENGTH = 64 * 1024; // 64KB
export const MIN_TIME_LIMIT_MS = 500;
export const MAX_TIME_LIMIT_MS = 10000;
export const DEFAULT_TIME_LIMIT_MS = 3000;
export const DEFAULT_MEMORY_LIMIT_KB = 128000;

export type ValidationResult =
  | { valid: true; request: ExecutionRequest }
  | { valid: false; error: string };

export function validateExecutionRequest(input: unknown): ValidationResult {
  if (!input || typeof input !== "object") {
    return { valid: false, error: "Invalid execution payload: expected JSON object." };
  }

  const raw = input as Record<string, unknown>;

  if (typeof raw.language !== "string") {
    return { valid: false, error: "Missing or invalid 'language' field." };
  }

  const language = raw.language.toLowerCase() as ExecutionLanguage;
  if (!SUPPORTED_EXECUTION_LANGUAGES.includes(language)) {
    return {
      valid: false,
      error: `Unsupported language '${raw.language}'. Supported languages: ${SUPPORTED_EXECUTION_LANGUAGES.join(", ")}.`,
    };
  }

  if (typeof raw.sourceCode !== "string" || raw.sourceCode.trim().length === 0) {
    return { valid: false, error: "Source code cannot be empty." };
  }

  if (raw.sourceCode.length > MAX_SOURCE_LENGTH) {
    return {
      valid: false,
      error: `Source code length (${raw.sourceCode.length} bytes) exceeds maximum allowed length of ${MAX_SOURCE_LENGTH} bytes.`,
    };
  }

  let stdin: string | undefined = undefined;
  if (raw.stdin !== undefined && raw.stdin !== null) {
    if (typeof raw.stdin !== "string") {
      return { valid: false, error: "'stdin' must be a string." };
    }
    if (raw.stdin.length > MAX_STDIN_LENGTH) {
      return {
        valid: false,
        error: `Stdin exceeds maximum allowed length of ${MAX_STDIN_LENGTH} bytes.`,
      };
    }
    stdin = raw.stdin;
  }

  let timeLimitMs = DEFAULT_TIME_LIMIT_MS;
  if (typeof raw.timeLimitMs === "number" && !isNaN(raw.timeLimitMs)) {
    timeLimitMs = Math.min(
      Math.max(Math.floor(raw.timeLimitMs), MIN_TIME_LIMIT_MS),
      MAX_TIME_LIMIT_MS
    );
  }

  let memoryLimitKb = DEFAULT_MEMORY_LIMIT_KB;
  if (typeof raw.memoryLimitKb === "number" && !isNaN(raw.memoryLimitKb)) {
    memoryLimitKb = Math.max(16000, Math.floor(raw.memoryLimitKb));
  }

  return {
    valid: true,
    request: {
      language,
      sourceCode: raw.sourceCode,
      stdin,
      timeLimitMs,
      memoryLimitKb,
    },
  };
}
