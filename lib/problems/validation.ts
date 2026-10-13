import {
  type ProgrammingProblem,
  type ProblemDifficulty,
} from "@/types/problem";
import { SUPPORTED_EXECUTION_LANGUAGES } from "@/types/execution";

export const VALID_DIFFICULTIES: readonly ProblemDifficulty[] = [
  "beginner",
  "intermediate",
  "advanced",
] as const;

export function validateProblemSchema(
  problem: unknown
): { valid: true } | { valid: false; error: string } {
  if (!problem || typeof problem !== "object") {
    return { valid: false, error: "Problem must be a non-null object." };
  }

  const p = problem as Partial<ProgrammingProblem>;

  if (!p.id || typeof p.id !== "string") {
    return { valid: false, error: "Missing or invalid problem id." };
  }

  if (!p.title || typeof p.title !== "string") {
    return { valid: false, error: "Missing or invalid problem title." };
  }

  if (!p.description || typeof p.description !== "string") {
    return { valid: false, error: "Missing or invalid problem description." };
  }

  if (!p.difficulty || !VALID_DIFFICULTIES.includes(p.difficulty)) {
    return { valid: false, error: `Invalid difficulty '${String(p.difficulty)}'.` };
  }

  if (!Array.isArray(p.supportedLanguages) || p.supportedLanguages.length === 0) {
    return { valid: false, error: "Problem must support at least one language." };
  }

  for (const lang of p.supportedLanguages) {
    if (!SUPPORTED_EXECUTION_LANGUAGES.includes(lang)) {
      return { valid: false, error: `Unsupported language '${String(lang)}' in problem.` };
    }
  }

  if (!Array.isArray(p.testCases) || p.testCases.length === 0) {
    return { valid: false, error: "Problem must contain at least one test case." };
  }

  const hasVisible = p.testCases.some((t) => !t.isHidden);
  const hasHidden = p.testCases.some((t) => t.isHidden);

  if (!hasVisible) {
    return { valid: false, error: "Problem must contain at least one visible test case." };
  }

  if (!hasHidden) {
    return { valid: false, error: "Problem must contain at least one hidden test case." };
  }

  if (typeof p.timeLimitMs !== "number" || p.timeLimitMs < 200 || p.timeLimitMs > 10000) {
    return { valid: false, error: "timeLimitMs must be between 200ms and 10000ms." };
  }

  return { valid: true };
}
