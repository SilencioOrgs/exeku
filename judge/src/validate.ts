import type { LanguageSpec } from "./languages.ts";
import { LANGUAGES, type Language, type RunRequest } from "./types.ts";

export const MAX_FILES = 8;
export const MAX_SOURCE_BYTES = 256 * 1024;
export const MAX_STDINS = 64;
export const MAX_STDIN_TOTAL_BYTES = 8 * 1024 * 1024;
const FILE_NAME = /^[A-Za-z0-9_.-]{1,32}$/;

const clamp = (value: unknown, min: number, max: number, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? Math.min(Math.max(Math.floor(value), min), max) : fallback;

export type Validation = { ok: true; request: RunRequest } | { ok: false; error: string };

/** The worker re-checks everything: it trusts the caller's token, not the caller's input. */
export function validateRunRequest(body: unknown, specs: Partial<Record<Language, LanguageSpec>>): Validation {
  if (!body || typeof body !== "object") return { ok: false, error: "Expected a JSON object." };
  const raw = body as Record<string, unknown>;

  const language = raw.language as Language;
  if (!LANGUAGES.includes(language)) return { ok: false, error: `Unsupported language. Use one of: ${LANGUAGES.join(", ")}.` };
  const spec = specs[language];
  if (!spec) return { ok: false, error: `${language} is not installed on this judge.` };

  if (!Array.isArray(raw.files) || raw.files.length === 0 || raw.files.length > MAX_FILES) {
    return { ok: false, error: `Send between 1 and ${MAX_FILES} files.` };
  }
  const seen = new Set<string>();
  let sourceBytes = 0;
  const files = [];
  for (const entry of raw.files as unknown[]) {
    const file = entry as { name?: unknown; content?: unknown };
    if (typeof file?.name !== "string" || typeof file.content !== "string") return { ok: false, error: "Each file needs a name and content." };
    if (!FILE_NAME.test(file.name) || file.name.startsWith(".") || file.name.startsWith("-")) {
      return { ok: false, error: `Invalid file name '${file.name}'.` };
    }
    if (seen.has(file.name.toLowerCase())) return { ok: false, error: "Duplicate file name." };
    seen.add(file.name.toLowerCase());
    sourceBytes += Buffer.byteLength(file.content);
    files.push({ name: file.name, content: file.content });
  }
  if (sourceBytes > MAX_SOURCE_BYTES) return { ok: false, error: "Source files are too large." };
  if (files[0].name !== spec.mainFile) return { ok: false, error: `The first file must be ${spec.mainFile}.` };

  if (!Array.isArray(raw.stdins) || raw.stdins.length === 0 || raw.stdins.length > MAX_STDINS) {
    return { ok: false, error: `Send between 1 and ${MAX_STDINS} inputs.` };
  }
  let stdinBytes = 0;
  for (const stdin of raw.stdins as unknown[]) {
    if (typeof stdin !== "string") return { ok: false, error: "Each input must be a string." };
    stdinBytes += Buffer.byteLength(stdin);
  }
  if (stdinBytes > MAX_STDIN_TOTAL_BYTES) return { ok: false, error: "Inputs are too large." };

  return {
    ok: true,
    request: {
      language,
      files,
      stdins: raw.stdins as string[],
      timeLimitMs: clamp(raw.timeLimitMs, 100, 15_000, 2000),
      memoryLimitKb: clamp(raw.memoryLimitKb, 16 * 1024, 512 * 1024, 128 * 1024),
    },
  };
}
