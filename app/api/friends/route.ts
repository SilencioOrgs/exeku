import { NextResponse } from "next/server";
import { readJson } from "@/lib/accounts/read-json";
import { withApiErrors } from "@/lib/api/route-handler";
import { getViewer } from "@/lib/auth/viewer";
import { getFriendsFeed, performFriendAction } from "@/lib/friends/repository";

export const GET = (request: Request) =>
  withApiErrors("GET /api/friends", async () => {
    const viewer = await getViewer();
    if (!viewer) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
    return NextResponse.json(await getFriendsFeed(viewer, new URL(request.url).searchParams.get("q") ?? ""));
  });

export const POST = (request: Request) =>
  withApiErrors("POST /api/friends", async () => {
    const viewer = await getViewer();
    if (!viewer) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
    const body = await readJson(request);
    if (!body.ok) return NextResponse.json({ error: body.error }, { status: body.status });
    const result = await performFriendAction(viewer, body.value);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ ok: true });
  });
