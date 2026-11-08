import type { ProblemDifficulty, ProblemSummary } from "@/types/problem";

/** LeetCode-style topics. A problem belongs to a topic when one of its catalog tags matches. */
export const PROBLEM_TOPICS = [
  { id: "array", label: "Array", tags: ["array", "arrays"] },
  { id: "string", label: "String", tags: ["string", "strings"] },
  { id: "hash-table", label: "Hash Table", tags: ["hash-table", "hashmap"] },
  { id: "sorting", label: "Sorting", tags: ["sorting"] },
  { id: "math", label: "Math", tags: ["math", "arithmetic", "modulo"] },
  { id: "conditionals", label: "Conditionals", tags: ["conditionals", "logic"] },
  { id: "basics", label: "Basics", tags: ["basics", "io", "intro"] },
] as const;

export type TopicId = (typeof PROBLEM_TOPICS)[number]["id"] | "all";

export function inTopic(problem: ProblemSummary, topic: TopicId): boolean {
  if (topic === "all") return true;
  const tags: readonly string[] = PROBLEM_TOPICS.find((t) => t.id === topic)?.tags ?? [];
  return problem.tags.some((tag) => tags.includes(tag.toLowerCase()));
}

export const countInTopic = (problems: ProblemSummary[], topic: TopicId) => problems.filter((p) => inTopic(p, topic)).length;

export const SORT_OPTIONS = [
  { id: "default", label: "Sort: Default" },
  { id: "title", label: "Sort: Title A to Z" },
  { id: "easiest", label: "Sort: Easiest first" },
  { id: "hardest", label: "Sort: Hardest first" },
  { id: "tests", label: "Sort: Most tests" },
] as const;

export type SortId = (typeof SORT_OPTIONS)[number]["id"];

const DIFFICULTY_RANK: Record<ProblemDifficulty, number> = { beginner: 0, intermediate: 1, advanced: 2 };

export function sortProblems(problems: ProblemSummary[], sort: SortId): ProblemSummary[] {
  const sorted = [...problems];
  if (sort === "title") sorted.sort((a, b) => a.title.localeCompare(b.title));
  if (sort === "easiest") sorted.sort((a, b) => DIFFICULTY_RANK[a.difficulty] - DIFFICULTY_RANK[b.difficulty]);
  if (sort === "hardest") sorted.sort((a, b) => DIFFICULTY_RANK[b.difficulty] - DIFFICULTY_RANK[a.difficulty]);
  if (sort === "tests") sorted.sort((a, b) => b.totalTestsCount - a.totalTestsCount);
  return sorted;
}
