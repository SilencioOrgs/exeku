import "server-only";
import { getViewer } from "@/lib/auth/viewer";
import { invalidateLeaderboardCache } from "@/lib/competition/repository";
import { db, must } from "@/lib/db/client";
import { firstSolves } from "@/lib/judge/solves";
import type { WorkspaceFile } from "@/types/draft";
import type { ProblemDifficulty } from "@/types/problem";
import type { SolveMilestone } from "@/lib/judge/judging-service";

const POINTS: Record<ProblemDifficulty, number> = { beginner: 100, intermediate: 200, advanced: 300 };
const NOT_A_RESULT = ["SERVICE_UNAVAILABLE", "INTERNAL_JUDGE_ERROR"];

function isMissingSourceColumnError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === "42703" || error.code === "PGRST204") return true;
  const message = error.message ?? "";
  return /source_code|files/i.test(message) && /column|schema cache/i.test(message);
}

/** A database problem must never cost a student the verdict they just earned, so failures are only logged. */
export async function recordSubmission(
  problem: { id: string; difficulty: ProblemDifficulty },
  language: string,
  verdict: string,
  submittedAt?: string,
  knownUserId?: string,
  solution?: { sourceCode: string; files?: WorkspaceFile[] },
): Promise<SolveMilestone | null> {
  if (NOT_A_RESULT.includes(verdict)) return null;
  try {
    const userId = knownUserId ?? (await getViewer())?.id;
    if (!userId) return null;
    const accepted = verdict === "ACCEPTED";
    const isClassProblem = problem.id.startsWith("cls-");
    const points = accepted && !isClassProblem ? POINTS[problem.difficulty] : 0;
    const submissionId = crypto.randomUUID();
    const baseRow = {
      id: submissionId,
      user_id: userId,
      problem_id: problem.id,
      language,
      verdict,
      points,
      ...(submittedAt ? { created_at: submittedAt } : {}),
    };
    const saveCode = accepted && Boolean(solution);
    let storedCode = false;
    if (saveCode && solution) {
      const withCode = {
        ...baseRow,
        source_code: solution.sourceCode,
        files: solution.files?.length ? solution.files : null,
      };
      const attempt = await db().from("submissions").insert(withCode);
      if (attempt.error) {
        if (!isMissingSourceColumnError(attempt.error)) throw new Error(attempt.error.message);
        must(await db().from("submissions").insert(baseRow));
      } else {
        storedCode = true;
      }
    } else {
      must(await db().from("submissions").insert(baseRow));
    }
    if (!accepted) return null;
    if (storedCode) {
      // Overwrite previously saved code for this problem while preserving submission history rows.
      await db()
        .from("submissions")
        .update({ source_code: null, files: null })
        .eq("user_id", userId)
        .eq("problem_id", problem.id)
        .eq("verdict", "ACCEPTED")
        .neq("id", submissionId);
    }
    if (!isClassProblem) invalidateLeaderboardCache();
    const [earliest, allFirstSolves] = await Promise.all([
      db()
        .from("submissions")
        .select("id")
        .eq("user_id", userId)
        .eq("problem_id", problem.id)
        .eq("verdict", "ACCEPTED")
        .order("created_at")
        .order("id")
        .limit(1)
        .then((r) => must(r) as { id: string }[]),
      firstSolves(userId),
    ]);
    const firstSolve = earliest[0]?.id === submissionId;
    return { firstSolve, points: firstSolve ? points : 0, solved: allFirstSolves.length };
  } catch (error) {
    console.error("Could not save submission:", error instanceof Error ? error.message : "unknown error");
    return null;
  }
}
