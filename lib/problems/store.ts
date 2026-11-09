import "server-only";
import { db, must } from "@/lib/db/client";
import { getAllProblems, getProblemById, summarizeProblems, toVisibleProblem, type ProblemFilter } from "@/lib/problems/catalog";
import { ALL_SUPPORTED_LANGUAGES, getStarterCode } from "@/lib/workspace-defaults";
import type { ProblemDifficulty, ProgrammingProblem, ProblemSummary, TestCase, VisibleProblem } from "@/types/problem";
import type { PreferredLanguage } from "@/types/profile";

export interface ProblemRow {
  id: string; title: string; description: string; difficulty: ProblemDifficulty; category: string; tags: string[];
  supported_languages: PreferredLanguage[]; input_spec: string; output_spec: string; constraints: string[];
  test_cases: TestCase[]; time_limit_ms: number; memory_limit_kb: number;
}

export const toProblem = (r: ProblemRow): ProgrammingProblem => ({
  id: r.id, slug: r.id, title: r.title, description: r.description, difficulty: r.difficulty, category: r.category, tags: r.tags,
  supportedLanguages: r.supported_languages, inputSpec: r.input_spec, outputSpec: r.output_spec, constraints: r.constraints,
  sampleTestCases: r.test_cases.filter((t) => !t.isHidden).map((t) => ({ input: t.input, output: t.expectedOutput })),
  testCases: r.test_cases, timeLimitMs: r.time_limit_ms, memoryLimitKb: r.memory_limit_kb,
  starterCodes: Object.fromEntries(ALL_SUPPORTED_LANGUAGES.map((language) => [language, getStarterCode(language)])) as ProgrammingProblem["starterCodes"],
});

/** Full problem including hidden tests. Only the judge may use this; browsers get findVisibleProblem. */
export async function findProblem(id: string): Promise<ProgrammingProblem | null> {
  const builtIn = getProblemById(id);
  if (builtIn) return builtIn;
  const row = must(await db().from("problems").select("*").eq("id", id).maybeSingle()) as ProblemRow | null;
  return row ? toProblem(row) : null;
}

export async function findVisibleProblem(id: string): Promise<VisibleProblem | null> {
  const problem = await findProblem(id);
  return problem ? toVisibleProblem(problem) : null;
}

export async function listProblemSummaries(filter?: ProblemFilter): Promise<ProblemSummary[]> {
  const rows = must(await db().from("problems").select("*").order("created_at")) as ProblemRow[];
  return summarizeProblems([...getAllProblems(), ...rows.map(toProblem)], filter);
}
