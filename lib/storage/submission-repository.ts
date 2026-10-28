import type { LocalSubmissionRecord, ProblemProgressStatus, SubmissionResultMetadata } from "@/types/submission";
import {
  SUBMISSION_STORE,
  idbClear,
  idbDelete,
  idbGetAll,
  idbPut,
} from "./db";

export const SUBMISSION_HISTORY_EVENT = "exeku:submission-history-changed";

export class SubmissionRepositoryError extends Error {
  cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "SubmissionRepositoryError";
    this.cause = cause;
  }
}

function makeId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `submission_${crypto.randomUUID()}`;
  }
  return `submission_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

const VERDICTS = new Set([
  "ACCEPTED",
  "WRONG_ANSWER",
  "COMPILATION_ERROR",
  "RUNTIME_ERROR",
  "TIME_LIMIT_EXCEEDED",
  "INTERNAL_JUDGE_ERROR",
  "SERVICE_UNAVAILABLE",
]);

function safeCount(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

export class SubmissionRepository {
  async recordSubmission(profileId: string, result: SubmissionResultMetadata): Promise<LocalSubmissionRecord> {
    if (!profileId.trim()) throw new SubmissionRepositoryError("A profile is required to save submission history.");
    if (!result.problemId?.trim()) throw new SubmissionRepositoryError("A problem ID is required to save submission history.");
    if (!VERDICTS.has(result.overallVerdict)) throw new SubmissionRepositoryError("The judge returned an unknown verdict.");

    const record: LocalSubmissionRecord = {
      id: makeId(),
      profileId,
      problemId: result.problemId,
      language: result.language,
      verdict: result.overallVerdict,
      passedTests: safeCount(result.passedTests),
      totalTests: safeCount(result.totalTests),
      scorePercentage: Math.min(100, safeCount(result.scorePercentage)),
      maxDurationMs: safeCount(result.maxDurationMs),
      submittedAt: new Date().toISOString(),
    };

    try {
      await idbPut<LocalSubmissionRecord>(SUBMISSION_STORE, record);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent(SUBMISSION_HISTORY_EVENT, { detail: { profileId } }));
      }
      return record;
    } catch (error) {
      throw new SubmissionRepositoryError("Failed to save local submission history.", error);
    }
  }

  async getAllForProfile(profileId: string): Promise<LocalSubmissionRecord[]> {
    if (!profileId.trim()) return [];
    try {
      const all = await idbGetAll<LocalSubmissionRecord>(SUBMISSION_STORE);
      return all
        .filter((record) => record.profileId === profileId)
        .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
    } catch (error) {
      throw new SubmissionRepositoryError("Failed to retrieve local submission history.", error);
    }
  }

  async deleteForProfile(profileId: string): Promise<void> {
    try {
      const records = await idbGetAll<LocalSubmissionRecord>(SUBMISSION_STORE);
      await Promise.all(records.filter((record) => record.profileId === profileId).map((record) => idbDelete(SUBMISSION_STORE, record.id)));
    } catch (error) {
      throw new SubmissionRepositoryError("Failed to delete local submission history.", error);
    }
  }

  async clearAll(): Promise<void> {
    try {
      await idbClear(SUBMISSION_STORE);
    } catch (error) {
      throw new SubmissionRepositoryError("Failed to clear local submission history.", error);
    }
  }
}

export function getProblemStatus(problemId: string, submissions: readonly LocalSubmissionRecord[]): ProblemProgressStatus {
  const matching = submissions.filter((record) => record.problemId === problemId);
  if (matching.some((record) => record.verdict === "ACCEPTED")) return "solved";
  return matching.length > 0 ? "attempted" : "unsolved";
}

export const submissionRepository = new SubmissionRepository();
