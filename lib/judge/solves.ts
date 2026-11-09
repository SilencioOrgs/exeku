import "server-only";
import { db, must } from "@/lib/db/client";

/** Every accepted answer in a time window. Timestamps are the database's, so a browser can't backdate one. */
export async function solvesBetween(userIds: string[], startsAt: string, endsAt: string) {
  if (userIds.length === 0) return [];
  const rows = must(await db().from("submissions").select("user_id,problem_id,points,created_at").in("user_id", userIds).eq("verdict", "ACCEPTED").gte("created_at", startsAt).lte("created_at", endsAt).order("created_at")) as { user_id: string; problem_id: string; points: number; created_at: string }[];
  return rows.map((r) => ({ userId: r.user_id, problemId: r.problem_id, points: r.points, at: r.created_at }));
}

/** When each accepted answer happened, for the activity chart. */
export async function acceptedTimes(userId: string) {
  const rows = must(await db().from("submissions").select("created_at").eq("user_id", userId).eq("verdict", "ACCEPTED")) as { created_at: string }[];
  return rows.map((r) => r.created_at);
}

/** Each problem once, at the moment it was first accepted. */
export async function firstSolves(userId: string) {
  const rows = must(await db().from("submissions").select("problem_id,created_at").eq("user_id", userId).eq("verdict", "ACCEPTED").order("created_at")) as { problem_id: string; created_at: string }[];
  const first = new Map<string, string>();
  for (const row of rows) if (!first.has(row.problem_id)) first.set(row.problem_id, row.created_at);
  return [...first].map(([problemId, solvedAt]) => ({ problemId, solvedAt }));
}
