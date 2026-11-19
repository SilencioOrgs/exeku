import type { LeaderboardEntry, LeaderboardScore } from "@/types/competition";

/** Highest points first. Equal points share a rank, and the next rank skips ahead (1, 1, 3). */
export function rankScores(scores: LeaderboardScore[]): LeaderboardEntry[] {
  const sorted = [...scores].sort((a, b) => b.points - a.points);
  let rank = 1;
  return sorted.map((score, index) => {
    if (index > 0 && sorted[index - 1].points !== score.points) rank = index + 1;
    return { ...score, rank };
  });
}
