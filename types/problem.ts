import type { ExecutionLanguage } from "@/types/execution";

export type ProblemDifficulty = "beginner" | "intermediate" | "advanced";

export interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  isHidden: boolean;
  explanation?: string;
}

export interface SampleTestCase {
  input: string;
  output: string;
  explanation?: string;
}

export interface ProgrammingProblem {
  id: string;
  slug: string;
  title: string;
  description: string;
  difficulty: ProblemDifficulty;
  category: string;
  tags: string[];
  supportedLanguages: ExecutionLanguage[];
  inputSpec: string;
  outputSpec: string;
  constraints: string[];
  sampleTestCases: SampleTestCase[];
  testCases: TestCase[];
  timeLimitMs: number;
  memoryLimitKb: number;
  starterCodes: Record<ExecutionLanguage, string>;
}

export interface VisibleTestCase {
  id: string;
  input: string;
  expectedOutput: string;
  explanation?: string;
}

export interface VisibleProblem {
  id: string;
  slug: string;
  title: string;
  description: string;
  difficulty: ProblemDifficulty;
  category: string;
  tags: string[];
  supportedLanguages: ExecutionLanguage[];
  inputSpec: string;
  outputSpec: string;
  constraints: string[];
  sampleTestCases: SampleTestCase[];
  visibleTestCases: VisibleTestCase[];
  timeLimitMs: number;
  memoryLimitKb: number;
  starterCodes: Record<ExecutionLanguage, string>;
}

export interface ProblemSummary {
  id: string;
  slug: string;
  title: string;
  difficulty: ProblemDifficulty;
  category: string;
  tags: string[];
  supportedLanguages: ExecutionLanguage[];
  sampleCount: number;
  totalTestsCount: number;
}
