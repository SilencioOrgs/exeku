import type { ExecutionLanguage } from "@/types/execution";
import type { ProblemDifficulty, ProblemSummary } from "@/types/problem";
import type { ProblemProgressStatus } from "@/types/submission";

export type ProblemStatusFilter = "all" | ProblemProgressStatus;
export type ProblemDifficultyFilter = "all" | ProblemDifficulty;

export interface ProblemListFilters {
  query: string;
  status: ProblemStatusFilter;
  difficulty: ProblemDifficultyFilter;
  category: string;
  language: "all" | ExecutionLanguage;
  tag: string;
  statuses: ReadonlyMap<string, ProblemProgressStatus>;
}

export interface ProblemPage<T> {
  items: T[];
  page: number;
  pageCount: number;
  total: number;
}

export function filterProblemSummaries(
  problems: readonly ProblemSummary[],
  filters: ProblemListFilters,
): ProblemSummary[] {
  const query = filters.query.trim().toLocaleLowerCase();
  const tag = filters.tag.toLocaleLowerCase();

  return problems.filter((problem) => {
    if (query) {
      const searchable = [problem.title, problem.category, problem.difficulty, ...problem.tags];
      if (!searchable.some((value) => value.toLocaleLowerCase().includes(query))) return false;
    }
    if (filters.status !== "all" && (filters.statuses.get(problem.id) ?? "unsolved") !== filters.status) return false;
    if (filters.difficulty !== "all" && problem.difficulty !== filters.difficulty) return false;
    if (filters.category !== "all" && problem.category !== filters.category) return false;
    if (filters.language !== "all" && !problem.supportedLanguages.includes(filters.language)) return false;
    if (tag !== "all" && !problem.tags.some((value) => value.toLocaleLowerCase() === tag)) return false;
    return true;
  });
}

export function paginateProblems<T>(items: readonly T[], requestedPage: number, pageSize: number): ProblemPage<T> {
  const safePageSize = Number.isFinite(pageSize) ? Math.max(1, Math.floor(pageSize)) : 10;
  const total = items.length;
  const pageCount = Math.ceil(total / safePageSize);
  const requested = Number.isFinite(requestedPage) ? Math.max(1, Math.floor(requestedPage)) : 1;
  const page = pageCount === 0 ? 1 : Math.min(requested, pageCount);
  const start = (page - 1) * safePageSize;
  return {
    items: items.slice(start, start + safePageSize),
    page,
    pageCount,
    total,
  };
}
