import { NextResponse } from "next/server";
import { findVisibleProblem } from "@/lib/problems/store";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const problem = await findVisibleProblem(id);

    if (!problem) {
      return NextResponse.json({ error: "Problem not found" }, { status: 404 });
    }

    return NextResponse.json(problem);
  } catch (err: unknown) {
    console.error("Could not load problem:", err instanceof Error ? err.message : "unknown error");
    return NextResponse.json({ error: "We couldn't load this problem." }, { status: 500 });
  }
}
