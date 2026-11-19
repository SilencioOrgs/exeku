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

export interface ProblemLookupOptions {
  /** Admins can view and test problems scheduled for upcoming tournaments. */
  includeLocked?: boolean;
}

/** Problem IDs assigned to tournaments that have not started yet stay hidden from students until start time. */
export async function upcomingLockedProblemIds(now = new Date().toISOString()): Promise<Set<string>> {
  const rows = must(await db().from("events").select("problem_ids").gt("starts_at", now)) as { problem_ids: string[] | null }[];
  return new Set(rows.flatMap((row) => row.problem_ids ?? []));
}

/** Full problem including hidden tests. Only the judge may use this; browsers get findVisibleProblem. */
export async function findProblem(id: string, options?: ProblemLookupOptions): Promise<ProgrammingProblem | null> {
  if (!options?.includeLocked && (await upcomingLockedProblemIds()).has(id)) return null;
  const builtIn = getProblemById(id);
  if (builtIn) return builtIn;
  const row = must(await db().from("problems").select("*").eq("id", id).maybeSingle()) as ProblemRow | null;
  return row ? toProblem(row) : null;
}

export async function findVisibleProblem(id: string, options?: ProblemLookupOptions): Promise<VisibleProblem | null> {
  const problem = await findProblem(id, options);
  return problem ? toVisibleProblem(problem) : null;
}

export async function listProblemIds(): Promise<string[]> {
  const rows = must(await db().from("problems").select("id")) as { id: string }[];
  return [...getAllProblems().map((p) => p.id), ...rows.map((r) => r.id)];
}

export async function listProblemSummaries(filter?: ProblemFilter, options?: ProblemLookupOptions): Promise<ProblemSummary[]> {
  const [rows, locked] = await Promise.all([
    db().from("problems").select("*").order("created_at").then((result) => must(result) as ProblemRow[]),
    options?.includeLocked ? Promise.resolve(new Set<string>()) : upcomingLockedProblemIds(),
  ]);
  const all = [...getAllProblems(), ...rows.map(toProblem)].filter((problem) => !locked.has(problem.id));
  return summarizeProblems(all, filter);
}
