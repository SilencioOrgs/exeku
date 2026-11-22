import {
  type ProgrammingProblem,
  type VisibleProblem,
  type ProblemSummary,
} from "@/types/problem";

/**
 * Built-in catalog starts empty so no dummy problems appear in Challenges or Classes.
 * Real problems come from Supabase (created by teachers or admins), while language
 * basics and interactive examples live in the Learn curriculum (lib/learn/curriculum.ts).
 */
export const PROBLEM_CATALOG: ProgrammingProblem[] = [];

export function getAllProblems(): ProgrammingProblem[] {
  return [...PROBLEM_CATALOG];
}

export function getProblemById(id: string): ProgrammingProblem | null {
  return PROBLEM_CATALOG.find((p) => p.id === id || p.slug === id) || null;
}

export function getVisibleProblem(id: string): VisibleProblem | null {
  const full = getProblemById(id);
  return full ? toVisibleProblem(full) : null;
}

/** Drops hidden tests. Everything sent to a browser goes through here. */
export function toVisibleProblem(full: ProgrammingProblem): VisibleProblem {
  return {
    id: full.id,
    slug: full.slug,
    title: full.title,
    description: full.description,
    difficulty: full.difficulty,
    category: full.category,
    tags: full.tags,
    supportedLanguages: full.supportedLanguages,
    inputSpec: full.inputSpec,
    outputSpec: full.outputSpec,
    constraints: full.constraints,
    sampleTestCases: full.sampleTestCases,
    visibleTestCases: full.testCases
      .filter((t) => !t.isHidden)
      .map((t) => ({
        id: t.id,
        input: t.input,
        expectedOutput: t.expectedOutput,
        explanation: t.explanation,
      })),
    timeLimitMs: full.timeLimitMs,
    memoryLimitKb: full.memoryLimitKb,
    starterCodes: full.starterCodes,
  };
}

export interface ProblemFilter {
  difficulty?: string;
  language?: string;
  search?: string;
}

export function getProblemSummaries(filter?: ProblemFilter): ProblemSummary[] {
  return summarizeProblems(PROBLEM_CATALOG, filter);
}

export function summarizeProblems(problems: ProgrammingProblem[], filter?: ProblemFilter): ProblemSummary[] {
  return problems.filter((p) => {
    if (filter?.difficulty && filter.difficulty !== "all") {
      if (p.difficulty !== filter.difficulty) return false;
    }
    if (filter?.language) {
      if (!p.supportedLanguages.includes(filter.language as never)) return false;
    }
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      const matchTitle = p.title.toLowerCase().includes(q);
      const matchCategory = p.category.toLowerCase().includes(q);
      const matchTags = p.tags.some((t) => t.toLowerCase().includes(q));
      if (!matchTitle && !matchCategory && !matchTags) return false;
    }
    return true;
  }).map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    difficulty: p.difficulty,
    category: p.category,
    tags: p.tags,
    supportedLanguages: p.supportedLanguages,
    sampleCount: p.sampleTestCases.length,
    totalTestsCount: p.testCases.length,
  }));
}
