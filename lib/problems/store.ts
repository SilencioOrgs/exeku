import "server-only";
import { db, fetchAllPages, must } from "@/lib/db/client";
import { getAllProblems, getProblemById, summarizeProblems, toVisibleProblem, type ProblemFilter } from "@/lib/problems/catalog";
import { ALL_SUPPORTED_LANGUAGES, getStarterCode } from "@/lib/workspace-defaults";
import type { ProblemDifficulty, ProgrammingProblem, ProblemSummary, TestCase, VisibleProblem } from "@/types/problem";
import type { PreferredLanguage } from "@/types/profile";

export interface ProblemRow {
  id: string; title: string; description: string; difficulty: ProblemDifficulty; category: string; tags: string[];
  supported_languages: PreferredLanguage[]; input_spec: string; output_spec: string; constraints: string[];
  test_cases: TestCase[]; time_limit_ms: number; memory_limit_kb: number;
}

type ProblemSummaryRow = Pick<
  ProblemRow,
  "id" | "title" | "difficulty" | "category" | "tags" | "supported_languages" | "test_cases" | "time_limit_ms" | "memory_limit_kb"
>;

export const toProblem = (r: ProblemRow): ProgrammingProblem => ({
  id: r.id, slug: r.id, title: r.title, description: r.description, difficulty: r.difficulty, category: r.category, tags: r.tags,
  supportedLanguages: r.supported_languages, inputSpec: r.input_spec, outputSpec: r.output_spec, constraints: r.constraints,
  sampleTestCases: r.test_cases.filter((t) => !t.isHidden).map((t) => ({ input: t.input, output: t.expectedOutput })),
  testCases: r.test_cases, timeLimitMs: r.time_limit_ms, memoryLimitKb: r.memory_limit_kb,
  starterCodes: Object.fromEntries(ALL_SUPPORTED_LANGUAGES.map((language) => [language, getStarterCode(language)])) as ProgrammingProblem["starterCodes"],
});

export interface ProblemLookupOptions {
  /** Admins can view and test problems scheduled for upcoming or private live tournaments. */
  includeLocked?: boolean;
  /** Signed-in viewer ID, used to unlock live tournament problems only for registered participants. */
  userId?: string;
}

interface TournamentLockRow {
  id: string;
  problem_ids: string[] | null;
  starts_at: string | null;
  ends_at: string | null;
}

/**
 * Problem IDs that must stay hidden from this viewer:
 * - Every upcoming tournament (starts_at > now).
 * - Every live tournament (starts_at <= now < ends_at) where this viewer is not a registered participant.
 */
export async function lockedProblemIdsFor(userId?: string, now = new Date().toISOString()): Promise<Set<string>> {
  const rows = must(
    await db().from("events").select("id,problem_ids,starts_at,ends_at").gt("ends_at", now),
  ) as TournamentLockRow[];
  const nowMs = Date.parse(now);
  const locked = new Set<string>();
  const liveEvents: TournamentLockRow[] = [];

  for (const row of rows) {
    const ids = row.problem_ids ?? [];
    if (ids.length === 0 || !row.starts_at) continue;
    if (Date.parse(row.starts_at) > nowMs) {
      for (const pid of ids) locked.add(pid);
    } else {
      liveEvents.push(row);
    }
  }

  if (liveEvents.length === 0) return locked;

  const registeredEventIds = new Set<string>();
  if (userId) {
    const memberships = must(
      await db()
        .from("tournament_members")
        .select("event_id")
        .eq("user_id", userId)
        .in("event_id", liveEvents.map((e) => e.id)),
    ) as { event_id: string }[];
    for (const m of memberships) registeredEventIds.add(m.event_id);
  }

  for (const row of liveEvents) {
    if (!registeredEventIds.has(row.id)) {
      for (const pid of row.problem_ids ?? []) locked.add(pid);
    }
  }
  return locked;
}

/** Kept as alias for upcoming/live lock lookup without a viewer (locks all unended tournaments). */
export const upcomingLockedProblemIds = (now = new Date().toISOString()) => lockedProblemIdsFor(undefined, now);

/** Full problem including hidden tests. Only the judge may use this; browsers get findVisibleProblem. */
export async function findProblem(id: string, options?: ProblemLookupOptions): Promise<ProgrammingProblem | null> {
  if (!options?.includeLocked && (await lockedProblemIdsFor(options?.userId)).has(id)) return null;
  const builtIn = getProblemById(id);
  if (builtIn) return builtIn;
  const row = must(await db().from("problems").select("*").eq("id", id).maybeSingle()) as ProblemRow | null;
  return row ? toProblem(row) : null;
}

export async function findVisibleProblem(id: string, options?: ProblemLookupOptions): Promise<VisibleProblem | null> {
  const problem = await findProblem(id, options);
  return problem ? toVisibleProblem(problem) : null;
}

/** Lightweight existence check that avoids loading hidden test cases JSONB. */
export async function problemExists(id: string, options?: ProblemLookupOptions): Promise<boolean> {
  if (!options?.includeLocked && (await lockedProblemIdsFor(options?.userId)).has(id)) return false;
  if (getProblemById(id)) return true;
  const row = must(await db().from("problems").select("id").eq("id", id).maybeSingle()) as { id: string } | null;
  return Boolean(row);
}

export async function listProblemSummaries(filter?: ProblemFilter, options?: ProblemLookupOptions): Promise<ProblemSummary[]> {
  const [rows, locked] = await Promise.all([
    fetchAllPages<ProblemSummaryRow>((from, to) =>
      db()
        .from("problems")
        .select("id,title,difficulty,category,tags,supported_languages,test_cases,time_limit_ms,memory_limit_kb")
        .order("created_at")
        .order("id")
        .range(from, to),
    ),
    options?.includeLocked ? Promise.resolve(new Set<string>()) : lockedProblemIdsFor(options?.userId),
  ]);

  const builtIns = getAllProblems();
  const seen = new Set(builtIns.map((p) => p.id));
  const dbProblems: ProgrammingProblem[] = rows
    .filter((r) => !seen.has(r.id))
    .map((r) =>
      toProblem({
        ...r,
        description: "",
        input_spec: "",
        output_spec: "",
        constraints: [],
      }),
    );

  const all = [...builtIns, ...dbProblems].filter((problem) => !locked.has(problem.id));
  return summarizeProblems(all, filter);
}
