import { NextResponse } from "next/server";
import { unstable_rethrow } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { isAdmin } from "@/lib/auth/admin-check";
import { findVisibleProblem } from "@/lib/problems/store";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });

    const { id } = await params;
    const includeLocked = await isAdmin(userId);
    const problem = await findVisibleProblem(id, { includeLocked, userId });

    if (!problem) {
      return NextResponse.json({ error: "Problem not found" }, { status: 404 });
    }

    return NextResponse.json(problem);
  } catch (err: unknown) {
    unstable_rethrow(err);
    console.error("Could not load problem:", err instanceof Error ? err.message : "unknown error");
    return NextResponse.json({ error: "We couldn't load this problem." }, { status: 500 });
  }
}
