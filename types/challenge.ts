/**
 * EXEKU — TIMED CHALLENGE SESSION CONTRACTS
 */

export type ChallengeSessionStatus =
  | "idle"
  | "active"
  | "submitting"
  | "submitted"
  | "expired"
  | "completed"
  | "forfeited";

export interface ChallengeSession {
  id: string;
  problemId: string;
  problemTitle: string;
  durationMs: number;
  startedAt: number;
  deadline: number; // Absolute timestamp: startedAt + durationMs
  status: ChallengeSessionStatus;
  submissionCount: number;
  lastVerdict?: string | null;
  completedAt?: number | null;
}

export const DEFAULT_CHALLENGE_DURATION_MS = 5 * 60 * 1000; // 5 minutes demo duration
export const CHALLENGE_STORAGE_KEY = "exeku:challenge-session";
