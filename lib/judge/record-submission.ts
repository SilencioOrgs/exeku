import "server-only";
import { getViewer } from "@/lib/auth/viewer";
import { db, must } from "@/lib/db/client";
import { firstSolves } from "@/lib/judge/solves";
import type { ProblemDifficulty } from "@/types/problem";
import type { SolveMilestone } from "@/lib/judge/judging-service";

const POINTS: Record<ProblemDifficulty, number> = { beginner: 100, intermediate: 200, advanced: 300 };
const NOT_A_RESULT = ["SERVICE_UNAVAILABLE", "INTERNAL_JUDGE_ERROR"];

/** A database problem must never cost a student the verdict they just earned, so failures are only logged. */
export async function recordSubmission(problem: { id: string; difficulty: ProblemDifficulty }, language: string, verdict: string): Promise<SolveMilestone | null> {
  if (NOT_A_RESULT.includes(verdict)) return null;
  try {
    const viewer = await getViewer();
    if (!viewer) return null;
    const accepted = verdict === "ACCEPTED";
    const before = accepted ? await firstSolves(viewer.id) : [];
    const firstSolve = accepted && !before.some((s) => s.problemId === problem.id);
    const points = accepted ? POINTS[problem.difficulty] : 0;
    must(await db().from("submissions").insert({ user_id: viewer.id, problem_id: problem.id, language, verdict, points }));
    return accepted ? { firstSolve, points: firstSolve ? points : 0, solved: before.length + (firstSolve ? 1 : 0) } : null;
  } catch (error) {
    console.error("Could not save submission:", error instanceof Error ? error.message : "unknown error");
    return null;
  }
}
