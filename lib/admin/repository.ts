import "server-only";
import type { Viewer } from "@/lib/auth/viewer";
import { isObject, text } from "@/lib/accounts/rules";
import { db, must } from "@/lib/db/client";
import { getProblemById } from "@/lib/problems/catalog";
import { checkNewProblem } from "@/lib/problems/rules";
import type { FieldErrors } from "@/types/account";
import type { AdminUser } from "@/types/admin";

export type AdminResult = { ok: true } | { ok: false; status: number; error?: string; fieldErrors?: FieldErrors };

export interface ManagedProblem { id: string; title: string; difficulty: string; category: string; sampleCount: number; hiddenCount: number }

const UNIQUE_VIOLATION = "23505";
const DUPLICATE_TITLE = "A problem with this title already exists.";
/** Long enough to register again after a reset. */
const RESTART_DELAY_MS = 3 * 60 * 1000;

// shortcut: shows the newest 500 accounts with no paging, add paging past a few hundred students.
const MAX_USERS = 500;

/** Admin-only list. Age is left out because nothing here needs it. */
export async function listUsers(): Promise<AdminUser[]> {
  const rows = must(await db().from("profiles").select("user_id,display_name,avatar_id,border_id,school_email,school,is_admin,created_at").order("created_at", { ascending: false }).limit(MAX_USERS)) as {
    user_id: string; display_name: string; avatar_id: string; border_id: string; school_email: string | null; school: { campus?: string; program?: string } | null; is_admin: boolean; created_at: string;
  }[];
  const scores = must(await db().from("leaderboard").select("user_id,solved,points")) as { user_id: string; solved: number; points: number }[];
  const scoreOf = new Map(scores.map((s) => [s.user_id, s]));
  return rows.map((r) => ({
    id: r.user_id, name: r.display_name, avatarId: r.avatar_id, borderId: r.border_id, schoolEmail: r.school_email ?? undefined,
    campus: r.school?.campus, program: r.school?.program, solved: scoreOf.get(r.user_id)?.solved ?? 0, points: scoreOf.get(r.user_id)?.points ?? 0,
    isAdmin: r.is_admin, joinedAt: r.created_at,
  }));
}

export async function listManagedProblems(): Promise<ManagedProblem[]> {
  const rows = must(await db().from("problems").select("id,title,difficulty,category,test_cases").order("created_at", { ascending: false })) as { id: string; title: string; difficulty: string; category: string; test_cases: { isHidden: boolean }[] }[];
  // Counts only: the tests themselves never leave the server, even for admins.
  return rows.map((r) => ({ id: r.id, title: r.title, difficulty: r.difficulty, category: r.category, sampleCount: r.test_cases.filter((t) => !t.isHidden).length, hiddenCount: r.test_cases.filter((t) => t.isHidden).length }));
}

export async function createProblem(viewer: Viewer, input: unknown): Promise<AdminResult> {
  const checked = checkNewProblem(input);
  if (!checked.ok) return { ok: false, status: 422, fieldErrors: checked.fieldErrors };
  const p = checked.problem;
  if (getProblemById(p.id)) return { ok: false, status: 409, fieldErrors: { title: DUPLICATE_TITLE } };
  const { error } = await db().from("problems").insert({
    id: p.id, title: p.title, description: p.description, difficulty: p.difficulty, category: p.category, tags: [],
    supported_languages: p.supportedLanguages, input_spec: p.inputSpec, output_spec: p.outputSpec, constraints: p.constraints,
    test_cases: p.testCases, time_limit_ms: p.timeLimitMs, memory_limit_kb: p.memoryLimitKb, created_by: viewer.id,
  });
  if (error?.code === UNIQUE_VIOLATION) return { ok: false, status: 409, fieldErrors: { title: DUPLICATE_TITLE } };
  if (error) throw new Error(`Database error: ${error.message}`);
  return { ok: true };
}

export async function deleteProblem(input: unknown): Promise<AdminResult> {
  const id = isObject(input) ? text(input, "id") : "";
  if (!id) return { ok: false, status: 400, error: "Choose a problem." };
  must(await db().from("problems").delete().eq("id", id));
  return { ok: true };
}

export const resetAllowed = (env: { NODE_ENV?: string } = process.env) => env.NODE_ENV !== "production";

// Problems, schools, orgs and events are not listed, so a reset never touches them.
const ACTIVITY_TABLES: [string, string][] = [
  ["submissions", "user_id"],
  ["tournament_violations", "event_id"],
  ["tournament_teams", "event_id"], // also removes tournament_members
  ["friendships", "requester"],
  ["org_applications", "org_id"],
  ["school_requests", "requested_by"],
];

/** Development only: clears test activity and reopens every tournament for registration. */
export async function resetDatabase(input: unknown, env: { NODE_ENV?: string } = process.env): Promise<AdminResult> {
  if (!resetAllowed(env)) return { ok: false, status: 403, error: "Reset is turned off in production." };
  if (!isObject(input) || input.confirm !== "RESET") return { ok: false, status: 400, error: "Type RESET to confirm." };

  for (const [table, column] of ACTIVITY_TABLES) must(await db().from(table).delete().not(column, "is", null));

  const tournaments = must(await db().from("events").select("id,starts_at,ends_at").not("starts_at", "is", null)) as { id: string; starts_at: string; ends_at: string }[];
  for (const t of tournaments) {
    const startsAt = Date.now() + RESTART_DELAY_MS;
    must(await db().from("events").update({
      starts_at: new Date(startsAt).toISOString(),
      ends_at: new Date(startsAt + Date.parse(t.ends_at) - Date.parse(t.starts_at)).toISOString(),
    }).eq("id", t.id));
  }

  // Admins are kept so a reset can't lock anyone out of this page.
  if (input.includeAccounts === true) must(await db().from("profiles").delete().eq("is_admin", false));
  return { ok: true };
}
