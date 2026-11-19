export interface TeamEntry { id: string; memberIds: string[] }
export interface TimedSolve { userId: string; problemId: string; points: number; at: string }
export interface TeamStanding { teamId: string; points: number; solved: number; lastAt: string | null; rank: number }

function compareIso(a: string | null, b: string | null): number {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  const diff = Date.parse(a) - Date.parse(b);
  if (Number.isFinite(diff) && diff !== 0) return diff;
  return a.localeCompare(b);
}

const sameInstant = (a: string | null, b: string | null) =>
  a === b || (a !== null && b !== null && Date.parse(a) === Date.parse(b));

/** Each problem counts once per team, at its first accepted answer. More points wins, then the earlier finish. */
export function rankTeams(teams: TeamEntry[], solves: TimedSolve[], problemIds: string[]): TeamStanding[] {
  const allowedProblems = new Set(problemIds);
  const teamByUser = new Map<string, string>();
  for (const team of teams) {
    for (const memberId of team.memberIds) teamByUser.set(memberId, team.id);
  }
  const ordered = [...solves].sort((a, b) => compareIso(a.at, b.at));
  const firstByTeam = new Map<string, Map<string, TimedSolve>>();
  for (const solve of ordered) {
    if (!allowedProblems.has(solve.problemId)) continue;
    const teamId = teamByUser.get(solve.userId);
    if (!teamId) continue;
    let first = firstByTeam.get(teamId);
    if (!first) {
      first = new Map();
      firstByTeam.set(teamId, first);
    }
    if (!first.has(solve.problemId)) first.set(solve.problemId, solve);
  }
  const scored = teams.map((team) => {
    const counted = [...(firstByTeam.get(team.id)?.values() ?? [])];
    return {
      teamId: team.id,
      points: counted.reduce((sum, s) => sum + s.points, 0),
      solved: counted.length,
      lastAt: counted.at(-1)?.at ?? null,
    };
  });
  const sorted = scored.sort((a, b) => b.points - a.points || compareIso(a.lastAt, b.lastAt));
  let rank = 1;
  return sorted.map((team, index) => {
    if (index > 0) {
      const prev = sorted[index - 1];
      if (prev.points !== team.points || !sameInstant(prev.lastAt, team.lastAt)) rank = index + 1;
    }
    return { ...team, rank };
  });
}
