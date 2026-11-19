import "server-only";
import { db, must } from "@/lib/db/client";

const PAGE_SIZE = 1000;

async function paginate<T>(fetchPage: (from: number, to: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<T[]> {
  const all: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const page = must(await fetchPage(from, from + PAGE_SIZE - 1)) as T[];
    all.push(...page);
    if (page.length < PAGE_SIZE) break;
  }
  return all;
}

/** Every accepted answer in a time window. Timestamps are the database's, so a browser can't backdate one. */
export async function solvesBetween(userIds: string[], startsAt: string, endsAt: string) {
  if (userIds.length === 0) return [];
  const rows = await paginate<{ user_id: string; problem_id: string; points: number; created_at: string }>((from, to) =>
    db().from("submissions").select("user_id,problem_id,points,created_at").in("user_id", userIds).eq("verdict", "ACCEPTED").gte("created_at", startsAt).lte("created_at", endsAt).order("created_at").order("id").range(from, to),
  );
  return rows.map((r) => ({ userId: r.user_id, problemId: r.problem_id, points: r.points, at: r.created_at }));
}

/** When each accepted answer happened, for the activity chart. */
export async function acceptedTimes(userId: string) {
  const rows = await paginate<{ created_at: string }>((from, to) =>
    db().from("submissions").select("created_at").eq("user_id", userId).eq("verdict", "ACCEPTED").order("created_at").order("id").range(from, to),
  );
  return rows.map((r) => r.created_at);
}

/** Each problem once, at the moment it was first accepted. */
export async function firstSolves(userId: string) {
  const rows = await paginate<{ problem_id: string; created_at: string }>((from, to) =>
    db().from("submissions").select("problem_id,created_at").eq("user_id", userId).eq("verdict", "ACCEPTED").order("created_at").order("id").range(from, to),
  );
  const first = new Map<string, string>();
  for (const row of rows) if (!first.has(row.problem_id)) first.set(row.problem_id, row.created_at);
  return [...first].map(([problemId, solvedAt]) => ({ problemId, solvedAt }));
}
