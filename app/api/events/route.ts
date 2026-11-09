import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth/viewer";
import { getEventsFeed } from "@/lib/competition/repository";

export async function GET() {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  return NextResponse.json(await getEventsFeed(viewer));
}
