import { NextResponse } from "next/server";
import { readJson } from "@/lib/accounts/read-json";
import { withApiErrors } from "@/lib/api/route-handler";
import { getViewer } from "@/lib/auth/viewer";
import { getTournament, performTournamentAction } from "@/lib/tournaments/repository";

type Context = { params: Promise<{ id: string }> };
const signIn = () => NextResponse.json({ error: "Sign in to continue." }, { status: 401 });

export const GET = (_request: Request, { params }: Context) =>
  withApiErrors("GET /api/events/[id]/tournament", async () => {
    const viewer = await getViewer();
    if (!viewer) return signIn();
    const tournament = await getTournament(viewer, (await params).id);
    if (!tournament) return NextResponse.json({ error: "That tournament wasn't found." }, { status: 404 });
    return NextResponse.json(tournament);
  });

export const POST = (request: Request, { params }: Context) =>
  withApiErrors("POST /api/events/[id]/tournament", async () => {
    const viewer = await getViewer();
    if (!viewer) return signIn();
    const body = await readJson(request);
    if (!body.ok) return NextResponse.json({ error: body.error }, { status: body.status });
    const result = await performTournamentAction(viewer, (await params).id, body.value);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ ok: true });
  });
