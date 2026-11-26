import "server-only";
import { getOrLoadPublic, invalidatePublicCache } from "@/lib/cache/public-cache";
import { db, fetchAllPages, must } from "@/lib/db/client";
import { getAllProblems, getProblemById, matchesProblemFilter, summarizeProblems, toVisibleProblem, type ProblemFilter } from "@/lib/problems/catalog";
import { ALL_SUPPORTED_LANGUAGES, getStarterCode } from "@/lib/workspace-defaults";
import type { ProblemDifficulty, ProgrammingProblem, ProblemSummary, TestCase, VisibleProblem } from "@/types/problem";
import type { PreferredLanguage } from "@/types/profile";

export interface ProblemRow {
  id: string; title: string; description: string; difficulty: ProblemDifficulty; category: string; tags: string[];
  supported_languages: PreferredLanguage[]; input_spec: string; output_spec: string; constraints: string[];
  test_cases: TestCase[]; time_limit_ms: number; memory_limit_kb: number; created_by?: string | null;
}

export const isClassProblemId = (id: string): boolean => id.startsWith("cls-");

type ProblemSummaryViewRow = {
  id: string;
  title: string;
  difficulty: ProblemDifficulty;
  category: string;
  tags: string[];
  supported_languages: PreferredLanguage[];
  sample_count: number;
  total_tests_count: number;
};

type ProblemSummaryFallbackRow = Pick<
  ProblemRow,
  "id" | "title" | "difficulty" | "category" | "tags" | "supported_languages" | "test_cases"
>;

const IN_CHUNK_SIZE = 100;
const PUBLIC_SUMMARIES_TTL_MS = 30_000;

export function invalidateProblemCatalogCache(): void {
  invalidatePublicCache("problems:");
}

export const toProblem = (r: ProblemRow): ProgrammingProblem => ({
  id: r.id, slug: r.id, title: r.title, description: r.description, difficulty: r.difficulty, category: r.category, tags: r.tags,
  supportedLanguages: r.supported_languages, inputSpec: r.input_spec, outputSpec: r.output_spec, constraints: r.constraints,
  sampleTestCases: r.test_cases.filter((t) => !t.isHidden).map((t) => ({ input: t.input, output: t.expectedOutput, explanation: t.explanation })),
  testCases: r.test_cases, timeLimitMs: r.time_limit_ms, memoryLimitKb: r.memory_limit_kb,
  starterCodes: Object.fromEntries(ALL_SUPPORTED_LANGUAGES.map((language) => [language, getStarterCode(language)])) as ProgrammingProblem["starterCodes"],
});

export interface ProblemLookupOptions {
  /** Admins can view and test problems scheduled for upcoming or private live tournaments. */
  includeLocked?: boolean;
  /** Include custom teacher-created class problems (cls-*) when resolving class assignments. */
  includeClassProblems?: boolean;
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
  const rows = await fetchAllPages<TournamentLockRow>((from, to) =>
    db().from("events").select("id,problem_ids,starts_at,ends_at").gt("ends_at", now).order("id").range(from, to),
  );
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
    const liveIds = liveEvents.map((e) => e.id);
    const batches = await Promise.all(
      Array.from({ length: Math.ceil(liveIds.length / IN_CHUNK_SIZE) }, (_, idx) =>
        db()
          .from("tournament_members")
          .select("event_id")
          .eq("user_id", userId)
          .in("event_id", liveIds.slice(idx * IN_CHUNK_SIZE, (idx + 1) * IN_CHUNK_SIZE))
          .then((r) => must(r) as { event_id: string }[]),
      ),
    );
    for (const batch of batches) {
      for (const m of batch) registeredEventIds.add(m.event_id);
    }
  }

  const unlocked = new Set<string>();
  for (const row of liveEvents) {
    if (registeredEventIds.has(row.id)) {
      for (const pid of row.problem_ids ?? []) unlocked.add(pid);
    } else {
      for (const pid of row.problem_ids ?? []) locked.add(pid);
    }
  }
  for (const pid of unlocked) locked.delete(pid);
  return locked;
}

async function canAccessClassProblem(
  problemId: string,
  userId?: string,
  createdBy?: string | null,
): Promise<boolean> {
  if (!userId) return false;
  if (createdBy && createdBy === userId) return true;
  const assignments = await fetchAllPages<{ class_id: string }>((from, to) =>
    db().from("class_problems").select("class_id").eq("problem_id", problemId).order("class_id").range(from, to),
  );
  const classIds = [...new Set(assignments.map((row) => row.class_id).filter(Boolean))];
  if (classIds.length === 0) return false;
  for (let i = 0; i < classIds.length; i += IN_CHUNK_SIZE) {
    const chunk = classIds.slice(i, i + IN_CHUNK_SIZE);
    const [taught, enrolled] = await Promise.all([
      db().from("classes").select("id").in("id", chunk).eq("teacher_id", userId).limit(1).then((r) => must(r) as { id: string }[]),
      db().from("class_members").select("class_id").in("class_id", chunk).eq("user_id", userId).limit(1).then((r) => must(r) as { class_id: string }[]),
    ]);
    if (taught.length > 0 || enrolled.length > 0) return true;
  }
  return false;
}

/** Full problem including hidden tests. Only the judge may use this; browsers get findVisibleProblem. */
export async function findProblem(id: string, options?: ProblemLookupOptions): Promise<ProgrammingProblem | null> {
  if (isClassProblemId(id) && !options?.includeLocked && !options?.userId) return null;
  const builtIn = getProblemById(id);
  if (builtIn) {
    if (!options?.includeLocked && (await lockedProblemIdsFor(options?.userId)).has(id)) return null;
    return builtIn;
  }
  const [locked, row] = await Promise.all([
    options?.includeLocked ? Promise.resolve(new Set<string>()) : lockedProblemIdsFor(options?.userId),
    db().from("problems").select("*").eq("id", id).maybeSingle().then((r) => must(r) as ProblemRow | null),
  ]);
  if (locked.has(id) || !row) return null;
  if (isClassProblemId(id) && !options?.includeLocked) {
    if (!(await canAccessClassProblem(id, options?.userId, row.created_by))) return null;
  }
  return toProblem(row);
}

export async function findVisibleProblem(id: string, options?: ProblemLookupOptions): Promise<VisibleProblem | null> {
  const problem = await findProblem(id, options);
  return problem ? toVisibleProblem(problem) : null;
}

/** Lightweight existence check that avoids loading hidden test cases JSONB. */
export async function problemExists(id: string, options?: ProblemLookupOptions): Promise<boolean> {
  if (isClassProblemId(id) && !options?.includeLocked && !options?.userId) return false;
  if (getProblemById(id)) {
    if (!options?.includeLocked && (await lockedProblemIdsFor(options?.userId)).has(id)) return false;
    return true;
  }
  const [locked, row] = await Promise.all([
    options?.includeLocked ? Promise.resolve(new Set<string>()) : lockedProblemIdsFor(options?.userId),
    db().from("problems").select("id,created_by").eq("id", id).maybeSingle().then((r) => must(r) as { id: string; created_by?: string | null } | null),
  ]);
  if (locked.has(id) || !row) return false;
  if (isClassProblemId(id) && !options?.includeLocked) {
    return canAccessClassProblem(id, options?.userId, row.created_by);
  }
  return true;
}

/**
 * Targeted title lookup for a small set of problem IDs (notifications, class validation)
 * without scanning the entire problem_summaries view or test_cases JSONB.
 */
export async function findProblemTitlesByIds(ids: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter(Boolean))];
  const titles = new Map<string, string>();
  const missing: string[] = [];

  for (const id of unique) {
    const builtIn = getProblemById(id);
    if (builtIn) titles.set(id, builtIn.title);
    else missing.push(id);
  }

  if (missing.length === 0) return titles;

  const batches = await Promise.all(
    Array.from({ length: Math.ceil(missing.length / IN_CHUNK_SIZE) }, (_, idx) =>
      db()
        .from("problems")
        .select("id,title")
        .in("id", missing.slice(idx * IN_CHUNK_SIZE, (idx + 1) * IN_CHUNK_SIZE))
        .then((r) => must(r) as { id: string; title: string }[]),
    ),
  );
  for (const batch of batches) {
    for (const row of batch) titles.set(row.id, row.title);
  }
  return titles;
}

function mapViewSummary(r: ProblemSummaryViewRow): ProblemSummary {
  return {
    id: r.id,
    slug: r.id,
    title: r.title,
    difficulty: r.difficulty,
    category: r.category,
    tags: r.tags,
    supportedLanguages: r.supported_languages,
    sampleCount: r.sample_count,
    totalTestsCount: r.total_tests_count,
  };
}

function mapFallbackSummary(r: ProblemSummaryFallbackRow): ProblemSummary {
  return {
    id: r.id,
    slug: r.id,
    title: r.title,
    difficulty: r.difficulty,
    category: r.category,
    tags: r.tags,
    supportedLanguages: r.supported_languages,
    sampleCount: (r.test_cases ?? []).filter((t) => !t.isHidden).length,
    totalTestsCount: (r.test_cases ?? []).length,
  };
}

/** Targeted summary lookup for known IDs (e.g., student view of a class's assigned problems). */
export async function findProblemSummariesByIds(ids: string[]): Promise<ProblemSummary[]> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return [];

  const summaries: ProblemSummary[] = [];
  const missing: string[] = [];
  for (const id of unique) {
    const builtIn = getProblemById(id);
    if (builtIn) summaries.push(...summarizeProblems([builtIn]));
    else missing.push(id);
  }
  if (missing.length === 0) return summaries;

  const chunks = Array.from({ length: Math.ceil(missing.length / IN_CHUNK_SIZE) }, (_, idx) =>
    missing.slice(idx * IN_CHUNK_SIZE, (idx + 1) * IN_CHUNK_SIZE),
  );

  let usedView = false;
  try {
    const viewBatches = await Promise.all(
      chunks.map((chunk) =>
        db()
          .from("problem_summaries")
          .select("id,title,difficulty,category,tags,supported_languages,sample_count,total_tests_count")
          .in("id", chunk)
          .then((r) => must(r) as ProblemSummaryViewRow[]),
      ),
    );
    const viewRows = viewBatches.flat();
    if (viewRows.length > 0 && typeof viewRows[0]?.total_tests_count === "number") {
      usedView = true;
      for (const row of viewRows) summaries.push(mapViewSummary(row));
    }
  } catch {
    /* Fall back to problems table if problem_summaries view is not migrated yet. */
  }

  if (!usedView) {
    const fallbackBatches = await Promise.all(
      chunks.map((chunk) =>
        db()
          .from("problems")
          .select("id,title,difficulty,category,tags,supported_languages,test_cases")
          .in("id", chunk)
          .then((r) => must(r) as ProblemSummaryFallbackRow[]),
      ),
    );
    for (const row of fallbackBatches.flat()) summaries.push(mapFallbackSummary(row));
  }

  return summaries;
}

async function loadRawDbProblemSummaries(): Promise<ProblemSummary[]> {
  try {
    const viewRows = await fetchAllPages<ProblemSummaryViewRow>((from, to) =>
      db()
        .from("problem_summaries")
        .select("id,title,difficulty,category,tags,supported_languages,sample_count,total_tests_count")
        .order("created_at")
        .order("id")
        .range(from, to),
    );
    // In tests or unmigrated DBs, a fake table without sample_count falls through below.
    if (viewRows.length > 0 && typeof viewRows[0]?.total_tests_count === "number") {
      return viewRows.map(mapViewSummary);
    }
  } catch {
    /* Fall back to problems table if problem_summaries view is not migrated yet. */
  }

  const rows = await fetchAllPages<ProblemSummaryFallbackRow>((from, to) =>
    db()
      .from("problems")
      .select("id,title,difficulty,category,tags,supported_languages,test_cases")
      .order("created_at")
      .order("id")
      .range(from, to),
  );
  return rows.map(mapFallbackSummary);
}

async function fetchDbProblemSummaries(): Promise<ProblemSummary[]> {
  return getOrLoadPublic("problems:summaries", PUBLIC_SUMMARIES_TTL_MS, loadRawDbProblemSummaries);
}

export async function listProblemSummaries(filter?: ProblemFilter, options?: ProblemLookupOptions): Promise<ProblemSummary[]> {
  const [dbSummaries, locked] = await Promise.all([
    fetchDbProblemSummaries(),
    options?.includeLocked ? Promise.resolve(new Set<string>()) : lockedProblemIdsFor(options?.userId),
  ]);

  const builtInSummaries = summarizeProblems(
    getAllProblems().filter((problem) => !locked.has(problem.id)),
    filter,
  );
  const seen = new Set(builtInSummaries.map((p) => p.id));
  const extra = dbSummaries.filter(
    (summary) =>
      !seen.has(summary.id) &&
      !locked.has(summary.id) &&
      (options?.includeClassProblems || !summary.id.startsWith("cls-")) &&
      matchesProblemFilter(summary, filter),
  );
  return [...builtInSummaries, ...extra];
}
