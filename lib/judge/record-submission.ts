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
    const points = accepted ? POINTS[problem.difficulty] : 0;
    const submissionId = crypto.randomUUID();
    must(await db().from("submissions").insert({ id: submissionId, user_id: viewer.id, problem_id: problem.id, language, verdict, points }));
    if (!accepted) return null;
    const earliest = must(
      await db().from("submissions").select("id").eq("user_id", viewer.id).eq("problem_id", problem.id).eq("verdict", "ACCEPTED").order("created_at").order("id").limit(1),
    ) as { id: string }[];
    const firstSolve = earliest[0]?.id === submissionId;
    const solved = (await firstSolves(viewer.id)).length;
    return { firstSolve, points: firstSolve ? points : 0, solved };
  } catch (error) {
    console.error("Could not save submission:", error instanceof Error ? error.message : "unknown error");
    return null;
  }
}
