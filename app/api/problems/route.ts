import { NextResponse } from "next/server";
import { getProblemSummaries } from "@/lib/problems/catalog";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const difficulty = searchParams.get("difficulty") || undefined;
    const language = searchParams.get("language") || undefined;
    const search = searchParams.get("search") || undefined;

    const summaries = getProblemSummaries({
      difficulty,
      language,
      search,
    });

    return NextResponse.json({ problems: summaries });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
