import "server-only";
import { NextResponse } from "next/server";
import { unstable_rethrow } from "next/navigation";

/** Wraps an API route handler so unexpected DB/runtime throws log server-side and return clean JSON 500. */
export async function withApiErrors(label: string, handler: () => Promise<NextResponse>): Promise<NextResponse> {
  try {
    return await handler();
  } catch (err: unknown) {
    unstable_rethrow(err);
    console.error(`[exeku-api] ${label}:`, err instanceof Error ? err.message : "unknown error");
    return NextResponse.json({ error: "Something went wrong on the server. Please try again." }, { status: 500 });
  }
}
