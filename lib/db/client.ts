import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | undefined;

/** Uses the secret key, which bypasses row level security, so this must stay on the server. */
export function db(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Database is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY.");
  return (client ??= createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }));
}

/** Database errors are logged by the route's 500 path and never sent to the browser. */
export function must<T>(result: { data: T; error: { message: string } | null }): T {
  if (result.error) throw new Error(`Database error: ${result.error.message}`);
  return result.data;
}

const DEFAULT_PAGE_SIZE = 1000;

/** Reads every page in range chunks so PostgREST's default 1,000-row cap never silently truncates results. */
export async function fetchAllPages<T>(
  queryPage: (from: number, to: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>,
  pageSize = DEFAULT_PAGE_SIZE,
): Promise<T[]> {
  const all: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const page = must(await queryPage(from, from + pageSize - 1)) as T[];
    all.push(...page);
    if (page.length < pageSize) break;
  }
  return all;
}

export async function exactCount(
  query: PromiseLike<{ count: number | null; error: { message: string } | null }>,
): Promise<number> {
  const res = await query;
  if (res.error) throw new Error(`Database error: ${res.error.message}`);
  return res.count ?? 0;
}

const MISSING_RELATION_RE = /relation "([^"]+)" does not exist|could not find the table '([^']+)' in the schema cache/i;

/** True only when Postgres/PostgREST reports that a migration table itself does not exist (never on FK/CHECK/RLS errors). */
export function isMissingRelationError(
  error: { code?: string | null; message?: string | null } | null | undefined,
  tables?: readonly string[],
): boolean {
  if (!error) return false;
  if (error.code === "42P01" || error.code === "PGRST205") return true;
  if (typeof error.message !== "string") return false;
  const match = MISSING_RELATION_RE.exec(error.message);
  if (!match) return false;
  if (!tables || tables.length === 0) return true;
  const relation = (match[1] ?? match[2] ?? "").replace(/^public\./, "").toLowerCase();
  return tables.some((t) => t.toLowerCase() === relation);
}
