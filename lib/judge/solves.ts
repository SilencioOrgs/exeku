import "server-only";
import { db, fetchAllPages } from "@/lib/db/client";

/** Every accepted answer in a time window. Timestamps are the database's, so a browser can't backdate one. */
export async function solvesBetween(userIds: string[], startsAt: string, endsAt: string) {
  if (userIds.length === 0) return [];
  const rows = await fetchAllPages<{ user_id: string; problem_id: string; points: number; created_at: string }>((from, to) =>
    db().from("submissions").select("user_id,problem_id,points,created_at").in("user_id", userIds).eq("verdict", "ACCEPTED").gte("created_at", startsAt).lte("created_at", endsAt).order("created_at").order("id").range(from, to),
  );
  return rows.map((r) => ({ userId: r.user_id, problemId: r.problem_id, points: r.points, at: r.created_at }));
}

/** Each problem once, at the moment it was first accepted. */
export async function firstSolves(userId: string) {
  const rows = await fetchAllPages<{ problem_id: string; created_at: string }>((from, to) =>
    db().from("submissions").select("problem_id,created_at").eq("user_id", userId).eq("verdict", "ACCEPTED").order("created_at").order("id").range(from, to),
  );
  const first = new Map<string, string>();
  for (const row of rows) if (!first.has(row.problem_id)) first.set(row.problem_id, row.created_at);
  return [...first].map(([problemId, solvedAt]) => ({ problemId, solvedAt }));
}

/** Computes distinct solved count and full accepted timestamp list from a single submissions scan. */
export async function solveSummary(userId: string): Promise<{ solved: number; solvedAt: string[] }> {
  const rows = await fetchAllPages<{ problem_id: string; created_at: string }>((from, to) =>
    db().from("submissions").select("problem_id,created_at").eq("user_id", userId).eq("verdict", "ACCEPTED").order("created_at").order("id").range(from, to),
  );
  const distinct = new Set<string>();
  const solvedAt: string[] = [];
  for (const row of rows) {
    distinct.add(row.problem_id);
    solvedAt.push(row.created_at);
  }
  return { solved: distinct.size, solvedAt };
}
