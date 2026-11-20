import { NextResponse } from "next/server";
import { withApiErrors } from "@/lib/api/route-handler";
import { getViewer } from "@/lib/auth/viewer";
import { getEventsFeed } from "@/lib/competition/repository";

export const GET = () =>
  withApiErrors("GET /api/events", async () => {
    const viewer = await getViewer();
    if (!viewer) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
    return NextResponse.json(await getEventsFeed(viewer));
  });
