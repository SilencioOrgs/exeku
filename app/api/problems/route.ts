import { NextResponse } from "next/server";
import { unstable_rethrow } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { isAdmin } from "@/lib/admin/guard";
import { listProblemSummaries } from "@/lib/problems/store";

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const difficulty = searchParams.get("difficulty") || undefined;
    const language = searchParams.get("language") || undefined;
    const search = searchParams.get("search") || undefined;
    const includeLocked = await isAdmin(userId);

    return NextResponse.json({ problems: await listProblemSummaries({ difficulty, language, search }, { includeLocked }) });
  } catch (err: unknown) {
    unstable_rethrow(err);
    console.error("Could not list problems:", err instanceof Error ? err.message : "unknown error");
    return NextResponse.json({ error: "We couldn't load the problems." }, { status: 500 });
  }
}
