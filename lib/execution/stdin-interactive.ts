import type { ExecutionLanguage, ExecutionResult } from "@/types/execution";
import { stripComments } from "./code-safety";

/**
 * How the workspace should collect stdin when the user clicks Run with an empty Input tab:
 * - "none": code does not appear to read stdin; run immediately.
 * - "interactive": Python `input()` or Java `Scanner.next*()` (throws on EOF); run step 0
 *   and prompt inline in the Console terminal whenever the program asks for a line.
 * - "prompt": C/C++ `cin`/`scanf`, Python `sys.stdin`, Java `BufferedReader`/`hasNext`;
 *   EOF does not reliably throw, so ask for input inline in the Console before running.
 */
export type StdinMode = "none" | "interactive" | "prompt";

export const MAX_INTERACTIVE_STEPS = 25;

/**
 * Replaces string and char literal contents with empty quotes after comments are removed,
 * so prompts like `print("use input()")` never falsely trigger stdin detection.
 */
export function stripStringsAndComments(source: string, language: ExecutionLanguage): string {
  const noComments = stripComments(source, language);
  const out: string[] = [];
  const len = noComments.length;
  let i = 0;

  while (i < len) {
    const ch = noComments[i];
    const next = i + 1 < len ? noComments[i + 1] : "";

    // Python triple-quoted strings and Java text blocks
    if (
      (language === "python" && (ch === '"' || ch === "'") && noComments[i + 1] === ch && noComments[i + 2] === ch) ||
      (language === "java" && ch === '"' && noComments[i + 1] === '"' && noComments[i + 2] === '"')
    ) {
      const quote = ch;
      out.push('""');
      i += 3;
      while (i < len) {
        if (noComments[i] === "\\" && i + 1 < len) {
          i += 2;
          continue;
        }
        if (noComments[i] === quote && noComments[i + 1] === quote && noComments[i + 2] === quote) {
          i += 3;
          break;
        }
        if (noComments[i] === "\n") out.push("\n");
        i += 1;
      }
      continue;
    }

    // C++ raw string literals R"delim(...)delim"
    if (
      language === "cpp" &&
      ch === "R" &&
      next === '"' &&
      (i === 0 || !/[A-Za-z0-9_]/.test(noComments[i - 1]))
    ) {
      const parenIdx = noComments.indexOf("(", i + 2);
      const delim = parenIdx !== -1 ? noComments.slice(i + 2, parenIdx) : null;
      if (delim !== null && delim.length <= 16 && !/[\s()\\]/.test(delim)) {
        const endMarker = `)${delim}"`;
        const closeIdx = noComments.indexOf(endMarker, parenIdx + 1);
        const end = closeIdx !== -1 ? closeIdx + endMarker.length : len;
        out.push('""');
        i = end;
        continue;
      }
    }

    // C++14+ numeric digit separator (e.g. 1'000)
    if (
      language === "cpp" &&
      ch === "'" &&
      i > 0 &&
      i + 1 < len &&
      /[0-9a-fA-F]/.test(noComments[i - 1]) &&
      /[0-9a-fA-F]/.test(noComments[i + 1])
    ) {
      out.push(ch);
      i += 1;
      continue;
    }

    if (ch === '"' || ch === "'") {
      const quote = ch;
      out.push(quote, quote);
      i += 1;
      while (i < len) {
        if (noComments[i] === "\\" && i + 1 < len) {
          i += 2;
          continue;
        }
        const cur = noComments[i];
        i += 1;
        if (cur === quote || cur === "\n") {
          if (cur === "\n") out.push("\n");
          break;
        }
      }
      continue;
    }

    out.push(ch);
    i += 1;
  }

  return out.join("");
}

/**
 * Inspects workspace files to determine whether running the program requires stdin
 * and whether interactive replay or upfront inline prompting is the right mode.
 */
export function detectStdinUsage(
  language: ExecutionLanguage,
  files: readonly { content: string }[],
): StdinMode {
  const combined = files.map((file) => stripStringsAndComments(file.content, language)).join("\n");
  if (!combined.trim()) return "none";

  if (language === "python") {
    // Batch stdin readers return "" on EOF instead of raising EOFError.
    if (/\bsys\s*\.\s*stdin\b|\bfileinput\s*\.\s*input\s*\(|\bopen\s*\(\s*0\s*[,)]/.test(combined)) {
      return "prompt";
    }
    if (/(?<![.\w])input\s*\(/.test(combined)) {
      return "interactive";
    }
    return "none";
  }

  if (language === "java") {
    const usesSystemIn = /\bSystem\s*\.\s*in\b/.test(combined);
    const usesConsole = /\bSystem\s*\.\s*console\s*\(/.test(combined);
    if (!usesSystemIn && !usesConsole) return "none";

    // Scanner.next*() throws NoSuchElementException on EOF when not guarded by hasNext*.
    const usesScanner = /\bnew\s+(?:java\.util\.)?Scanner\s*\(\s*System\s*\.\s*in\b/.test(combined);
    const usesBufferedOrStream = /\b(?:BufferedReader|InputStreamReader|DataInputStream)\b|\bSystem\s*\.\s*in\s*\.\s*read/.test(combined);
    const usesHasNext = /\.\s*hasNext(?:Line|Int|Long|Double|Float|Short|Byte|BigInteger|BigDecimal|Boolean)?\s*\(/.test(combined);
    const usesNext = /\.\s*next(?:Line|Int|Long|Double|Float|Short|Byte|BigInteger|BigDecimal|Boolean)?\s*\(/.test(combined);

    if (usesScanner && usesNext && !usesBufferedOrStream && !usesHasNext && !usesConsole) {
      return "interactive";
    }
    return "prompt";
  }

  if (language === "cpp") {
    const readsCin =
      /(?:std\s*::\s*)?\bcin\s*(?:>>|\.\s*(?:get|getline|read|peek|ignore)\s*\()/.test(combined) ||
      /(?:std\s*::\s*)?\bgetline\s*\(\s*(?:std\s*::\s*)?cin\b/.test(combined);
    const readsCStdin =
      /(?<![.\w])(?:std\s*::\s*)?(?:scanf|vscanf|getchar|gets)\s*\(/.test(combined) ||
      /(?<![.\w])(?:std\s*::\s*)?(?:fgets|fgetc|getc|fread)\s*\([^;]*\bstdin\b/.test(combined);
    return readsCin || readsCStdin ? "prompt" : "none";
  }

  // C
  const readsC =
    /(?<![.\w])(?:scanf|vscanf|getchar|gets)\s*\(/.test(combined) ||
    /(?<![.\w])(?:fgets|fgetc|getc|fread|getline)\s*\([^;]*\bstdin\b/.test(combined);
  return readsC ? "prompt" : "none";
}

/**
 * Returns true when a sandbox execution stopped because the program tried to read
 * another line/token from stdin after hitting EOF.
 */
export function isAwaitingStdin(language: ExecutionLanguage, result: ExecutionResult): boolean {
  if (result.status !== "RUNTIME_ERROR") return false;
  const stderr = result.stderr ?? "";
  if (!stderr) return false;

  if (language === "python") {
    return /\bEOFError\b/.test(stderr);
  }
  if (language === "java") {
    return /java\.util\.NoSuchElementException\b/.test(stderr) && /\bScanner\b/.test(stderr);
  }
  return false;
}

/**
 * Computes the newly produced stdout since the previous replay step.
 * If the program printed non-deterministic output before the prompt, prefixMatched is false.
 */
export function extractStdoutDelta(
  previousRawStdout: string,
  currentRawStdout: string,
): { delta: string; prefixMatched: boolean } {
  if (!previousRawStdout) {
    return { delta: currentRawStdout, prefixMatched: true };
  }
  if (currentRawStdout.startsWith(previousRawStdout)) {
    return { delta: currentRawStdout.slice(previousRawStdout.length), prefixMatched: true };
  }
  return { delta: currentRawStdout, prefixMatched: false };
}

/** Normalizes a line or multi-line paste sent at an interactive terminal prompt. */
export function appendInteractiveInput(stdinSoFar: string, entry: string): { nextStdin: string; displayInput: string } {
  const normalized = entry.replace(/\r\n/g, "\n");
  const displayInput = normalized.endsWith("\n") ? normalized.slice(0, -1) : normalized;
  return {
    nextStdin: `${stdinSoFar}${displayInput}\n`,
    displayInput,
  };
}
