import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { withApiErrors } from "@/lib/api/route-handler";
import { isAdmin } from "@/lib/auth/admin-check";
import { listProblemSummaries } from "@/lib/problems/store";

export const GET = (req: Request) =>
  withApiErrors("GET /api/problems", async () => {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const difficulty = searchParams.get("difficulty") || undefined;
    const language = searchParams.get("language") || undefined;
    const search = searchParams.get("search") || undefined;
    const includeLocked = await isAdmin(userId);

    return NextResponse.json({
      problems: await listProblemSummaries({ difficulty, language, search }, { includeLocked, userId }),
    });
  });
