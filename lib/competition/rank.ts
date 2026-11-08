import type { LeaderboardEntry, LeaderboardScore } from "@/types/competition";

/** Highest points first. Equal points share a rank, and the next rank skips ahead (1, 1, 3). */
export function rankScores(scores: LeaderboardScore[]): LeaderboardEntry[] {
  const sorted = [...scores].sort((a, b) => b.points - a.points);
  return sorted.map((score) => ({ ...score, rank: sorted.findIndex((s) => s.points === score.points) + 1 }));
}
