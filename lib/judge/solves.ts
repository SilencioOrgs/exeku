import "server-only";
import { db, fetchAllPages } from "@/lib/db/client";
import type { WorkspaceFile } from "@/types/draft";
import type { ExecutionLanguage } from "@/types/execution";
import type { SavedSolution } from "@/types/problem";

const IN_CHUNK_SIZE = 100;
const EXECUTION_LANGUAGES = new Set<ExecutionLanguage>(["python", "java", "cpp", "c"]);

function isExecutionLanguage(value: string): value is ExecutionLanguage {
  return EXECUTION_LANGUAGES.has(value as ExecutionLanguage);
}

function isMissingSourceColumnError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === "42703" || error.code === "PGRST204") return true;
  const message = error.message ?? "";
  return /source_code|files/i.test(message) && /column|schema cache/i.test(message);
}

function normalizeStoredFiles(raw: unknown): WorkspaceFile[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const normalized: WorkspaceFile[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const name = (entry as { name?: unknown }).name;
    const content = (entry as { content?: unknown }).content;
    if (typeof name === "string" && name.trim().length > 0 && typeof content === "string") {
      normalized.push({ name, content });
    }
  }
  return normalized.length > 0 ? normalized : undefined;
}

/** Every accepted answer in a time window. Timestamps are the database's, so a browser can't backdate one. */
export async function solvesBetween(userIds: string[], startsAt: string, endsAt: string) {
  const unique = [...new Set(userIds.filter(Boolean))];
  if (unique.length === 0) return [];
  const results: { userId: string; problemId: string; points: number; at: string }[] = [];
  for (let i = 0; i < unique.length; i += IN_CHUNK_SIZE) {
    const chunk = unique.slice(i, i + IN_CHUNK_SIZE);
    const rows = await fetchAllPages<{ user_id: string; problem_id: string; points: number; created_at: string }>((from, to) =>
      db().from("submissions").select("user_id,problem_id,points,created_at").in("user_id", chunk).eq("verdict", "ACCEPTED").gte("created_at", startsAt).lte("created_at", endsAt).order("created_at").order("id").range(from, to),
    );
    for (const r of rows) results.push({ userId: r.user_id, problemId: r.problem_id, points: r.points, at: r.created_at });
  }
  return results;
}

/** Each public/catalog problem once, at the moment it was first accepted (excludes private cls-* class problems). */
export async function firstSolves(userId: string) {
  const rows = await fetchAllPages<{ problem_id: string; created_at: string }>((from, to) =>
    db().from("submissions").select("problem_id,created_at").eq("user_id", userId).eq("verdict", "ACCEPTED").order("created_at").order("id").range(from, to),
  );
  const first = new Map<string, string>();
  for (const row of rows) {
    if (row.problem_id.startsWith("cls-")) continue;
    if (!first.has(row.problem_id)) first.set(row.problem_id, row.created_at);
  }
  return [...first].map(([problemId, solvedAt]) => ({ problemId, solvedAt }));
}

/** Computes distinct solved count (public/catalog problems) and full accepted timestamp list from a single submissions scan. */
export async function solveSummary(userId: string): Promise<{ solved: number; solvedAt: string[] }> {
  const rows = await fetchAllPages<{ problem_id: string; created_at: string }>((from, to) =>
    db().from("submissions").select("problem_id,created_at").eq("user_id", userId).eq("verdict", "ACCEPTED").order("created_at").order("id").range(from, to),
  );
  const distinct = new Set<string>();
  const solvedAt: string[] = [];
  for (const row of rows) {
    if (!row.problem_id.startsWith("cls-")) distinct.add(row.problem_id);
    solvedAt.push(row.created_at);
  }
  return { solved: distinct.size, solvedAt };
}

/** Distinct problem IDs accepted for this user (includes both catalog and class problems). */
export async function solvedProblemIds(userId: string): Promise<Set<string>> {
  const rows = await fetchAllPages<{ problem_id: string }>((from, to) =>
    db().from("submissions").select("problem_id").eq("user_id", userId).eq("verdict", "ACCEPTED").order("id").range(from, to),
  );
  return new Set(rows.map((r) => r.problem_id));
}

/** The user's latest accepted answer for one problem, including saved code when present. */
export async function latestAcceptedSolution(userId: string, problemId: string): Promise<SavedSolution | null> {
  const full = await db()
    .from("submissions")
    .select("language,source_code,files,created_at")
    .eq("user_id", userId)
    .eq("problem_id", problemId)
    .eq("verdict", "ACCEPTED")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(1);

  type Row = { language: string; source_code?: string | null; files?: unknown; created_at: string };
  let row: Row | undefined;

  if (full.error) {
    if (!isMissingSourceColumnError(full.error)) throw new Error(full.error.message);
    const fallback = await db()
      .from("submissions")
      .select("language,created_at")
      .eq("user_id", userId)
      .eq("problem_id", problemId)
      .eq("verdict", "ACCEPTED")
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(1);
    if (fallback.error) throw new Error(fallback.error.message);
    row = (fallback.data as Row[] | null)?.[0];
  } else {
    row = (full.data as Row[] | null)?.[0];
  }

  if (!row || !isExecutionLanguage(row.language)) return null;
  return {
    language: row.language,
    sourceCode: typeof row.source_code === "string" ? row.source_code : null,
    files: normalizeStoredFiles(row.files),
    solvedAt: row.created_at,
  };
}
