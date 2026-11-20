import { NextResponse } from "next/server";
import { withApiErrors } from "@/lib/api/route-handler";
import { getViewer } from "@/lib/auth/viewer";
import { getPublicProfile } from "@/lib/friends/repository";

export const GET = (_request: Request, { params }: { params: Promise<{ id: string }> }) =>
  withApiErrors("GET /api/friends/[id]", async () => {
    const viewer = await getViewer();
    if (!viewer) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
    const profile = await getPublicProfile(viewer, (await params).id);
    if (!profile) return NextResponse.json({ error: "That student wasn't found." }, { status: 404 });
    return NextResponse.json(profile);
  });
