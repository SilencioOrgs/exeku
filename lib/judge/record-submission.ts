import "server-only";
import { getViewer } from "@/lib/auth/viewer";
import { invalidateLeaderboardCache } from "@/lib/competition/repository";
import { db, must } from "@/lib/db/client";
import { firstSolves } from "@/lib/judge/solves";
import type { ProblemDifficulty } from "@/types/problem";
import type { SolveMilestone } from "@/lib/judge/judging-service";

const POINTS: Record<ProblemDifficulty, number> = { beginner: 100, intermediate: 200, advanced: 300 };
const NOT_A_RESULT = ["SERVICE_UNAVAILABLE", "INTERNAL_JUDGE_ERROR"];

/** A database problem must never cost a student the verdict they just earned, so failures are only logged. */
export async function recordSubmission(
  problem: { id: string; difficulty: ProblemDifficulty },
  language: string,
  verdict: string,
  submittedAt?: string,
  knownUserId?: string,
): Promise<SolveMilestone | null> {
  if (NOT_A_RESULT.includes(verdict)) return null;
  try {
    const userId = knownUserId ?? (await getViewer())?.id;
    if (!userId) return null;
    const accepted = verdict === "ACCEPTED";
    const isClassProblem = problem.id.startsWith("cls-");
    const points = accepted && !isClassProblem ? POINTS[problem.difficulty] : 0;
    const submissionId = crypto.randomUUID();
    const row = {
      id: submissionId,
      user_id: userId,
      problem_id: problem.id,
      language,
      verdict,
      points,
      ...(submittedAt ? { created_at: submittedAt } : {}),
    };
    must(await db().from("submissions").insert(row));
    if (!accepted) return null;
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
