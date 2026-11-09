import { NextResponse } from "next/server";
import { listProblemSummaries } from "@/lib/problems/store";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const difficulty = searchParams.get("difficulty") || undefined;
    const language = searchParams.get("language") || undefined;
    const search = searchParams.get("search") || undefined;

    return NextResponse.json({ problems: await listProblemSummaries({ difficulty, language, search }) });
  } catch (err: unknown) {
    console.error("Could not list problems:", err instanceof Error ? err.message : "unknown error");
    return NextResponse.json({ error: "We couldn't load the problems." }, { status: 500 });
  }
}
