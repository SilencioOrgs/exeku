export interface TeamEntry { id: string; memberIds: string[] }
export interface TimedSolve { userId: string; problemId: string; points: number; at: string }
export interface TeamStanding { teamId: string; points: number; solved: number; lastAt: string | null; rank: number }

/** Each problem counts once per team, at its first accepted answer. More points wins, then the earlier finish. */
export function rankTeams(teams: TeamEntry[], solves: TimedSolve[], problemIds: string[]): TeamStanding[] {
  const ordered = [...solves].sort((a, b) => a.at.localeCompare(b.at));
  const scored = teams.map((team) => {
    const first = new Map<string, TimedSolve>();
    for (const solve of ordered) {
      if (team.memberIds.includes(solve.userId) && problemIds.includes(solve.problemId) && !first.has(solve.problemId)) first.set(solve.problemId, solve);
    }
    const counted = [...first.values()];
    return { teamId: team.id, points: counted.reduce((sum, s) => sum + s.points, 0), solved: counted.length, lastAt: counted.at(-1)?.at ?? null };
  });
  const sorted = scored.sort((a, b) => b.points - a.points || (a.lastAt ?? "").localeCompare(b.lastAt ?? ""));
  return sorted.map((team) => ({ ...team, rank: sorted.findIndex((t) => t.points === team.points && t.lastAt === team.lastAt) + 1 }));
}
