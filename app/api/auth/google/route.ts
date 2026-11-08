import { NextResponse } from "next/server";

// shortcut: no auth provider is configured, return { redirectUrl } from Supabase signInWithOAuth here when the database lands.
export async function POST() {
  return NextResponse.json(
    { error: "Google sign-in isn't connected yet. Continue on this browser for now." },
    { status: 503 },
  );
}
