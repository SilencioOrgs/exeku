import type { ExecutionLanguage } from "./execution";

export type SubmissionVerdict =
  | "ACCEPTED"
  | "WRONG_ANSWER"
  | "COMPILATION_ERROR"
  | "RUNTIME_ERROR"
  | "TIME_LIMIT_EXCEEDED"
  | "INTERNAL_JUDGE_ERROR"
  | "SERVICE_UNAVAILABLE";

export type ProblemProgressStatus = "solved" | "attempted" | "unsolved";

/** Minimal, profile-scoped metadata from a real judge response. Never includes source or test payloads. */
export interface LocalSubmissionRecord {
  id: string;
  profileId: string;
  problemId: string;
  language: ExecutionLanguage;
  verdict: SubmissionVerdict;
  passedTests: number;
  totalTests: number;
  scorePercentage: number;
  maxDurationMs: number;
  submittedAt: string;
}

export interface SubmissionResultMetadata {
  problemId: string;
  language: ExecutionLanguage;
  overallVerdict: SubmissionVerdict;
  passedTests: number;
  totalTests: number;
  scorePercentage: number;
  maxDurationMs: number;
}
