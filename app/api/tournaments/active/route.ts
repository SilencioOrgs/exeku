import { NextResponse } from "next/server";
import { withApiErrors } from "@/lib/api/route-handler";
import { getViewer } from "@/lib/auth/viewer";
import { getActiveTournament } from "@/lib/tournaments/repository";

export const GET = () =>
  withApiErrors("GET /api/tournaments/active", async () => {
    const viewer = await getViewer();
    if (!viewer) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
    return NextResponse.json({ active: await getActiveTournament(viewer) });
  });
