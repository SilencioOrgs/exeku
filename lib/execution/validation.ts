import {
  type ExecutionRequest,
  type ExecutionLanguage,
  SUPPORTED_EXECUTION_LANGUAGES,
} from "@/types/execution";

export const MAX_FILES = 6;
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

  // Validate all companion files before any untrusted code reaches the sandbox.
  let files: { name: string; content: string }[] | undefined;
  if (raw.files !== undefined) {
    if (!Array.isArray(raw.files) || raw.files.length === 0 || raw.files.length > MAX_FILES) {
      return { valid: false, error: `Files must contain between 1 and ${MAX_FILES} entries.` };
    }
    const mainName = { python: "main.py", java: "Main.java", cpp: "main.cpp", c: "main.c" }[language];
    const allowed = {
      python: [".py"],
      java: [".java"],
      cpp: [".cpp", ".hpp", ".h"],
      c: [".c", ".h"],
    }[language];
    const seen = new Set<string>();
    files = [];
    for (const item of raw.files) {
      if (!item || typeof item !== "object") return { valid: false, error: "Invalid source file." };
      const entry = item as Record<string, unknown>;
      if (typeof entry.name !== "string" || entry.name.length > 24 || !/^[A-Za-z0-9_.-]+$/.test(entry.name)) {
        return { valid: false, error: "Invalid file name (letters, digits, ., _, -; up to 24 characters)." };
      }
      if (typeof entry.content !== "string") return { valid: false, error: "File content must be text." };
      const key = entry.name.toLowerCase();
      if (seen.has(key)) return { valid: false, error: "Duplicate file name." };
      if (!allowed.some((ext) => key.endsWith(ext))) return { valid: false, error: "File extension is not supported for this language." };
      seen.add(key);
      files.push({ name: entry.name, content: entry.content });
    }
    if (files[0]?.name !== mainName || files[0].content !== raw.sourceCode) {
      return { valid: false, error: `First file must be ${mainName} and must match sourceCode.` };
    }
    const bytes = files.reduce((total, file) => total + new TextEncoder().encode(file.content).byteLength, 0);
    if (bytes > MAX_SOURCE_LENGTH) {
      return { valid: false, error: "Total file contents exceed the 64 KB limit." };
    }
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
      files,
      stdin,
      timeLimitMs,
      memoryLimitKb,
    },
  };
}
