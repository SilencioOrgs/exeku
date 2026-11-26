import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { withApiErrors } from "@/lib/api/route-handler";
import { isAdmin } from "@/lib/auth/admin-check";
import { latestAcceptedSolution } from "@/lib/judge/solves";
import { findVisibleProblem } from "@/lib/problems/store";

export const GET = (_req: Request, { params }: { params: Promise<{ id: string }> }) =>
  withApiErrors("GET /api/problems/[id]", async () => {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });

    const { id } = await params;
    const includeLocked = await isAdmin(userId);
    const [problem, savedSolution] = await Promise.all([
      findVisibleProblem(id, { includeLocked, userId }),
      latestAcceptedSolution(userId, id),
    ]);

    if (!problem) {
      return NextResponse.json({ error: "Problem not found" }, { status: 404 });
    }

    return NextResponse.json(
      { ...problem, solved: Boolean(savedSolution), savedSolution },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  });
