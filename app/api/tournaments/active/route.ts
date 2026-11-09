import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth/viewer";
import { getActiveTournament } from "@/lib/tournaments/repository";

export async function GET() {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  return NextResponse.json({ active: await getActiveTournament(viewer) });
}
