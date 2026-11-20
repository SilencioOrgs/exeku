import { NextResponse } from "next/server";
import { readJson } from "@/lib/accounts/read-json";
import { withApiErrors } from "@/lib/api/route-handler";
import { getViewer } from "@/lib/auth/viewer";
import { getOrgDetail, performOrgAction } from "@/lib/orgs/repository";

type Context = { params: Promise<{ id: string }> };

export const GET = (_request: Request, { params }: Context) =>
  withApiErrors("GET /api/orgs/[id]", async () => {
    const viewer = await getViewer();
    if (!viewer) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
    const { id } = await params;
    const detail = await getOrgDetail(id, viewer);
    if (!detail) return NextResponse.json({ error: "That organization doesn't exist." }, { status: 404 });
    return NextResponse.json(detail);
  });

export const POST = (request: Request, { params }: Context) =>
  withApiErrors("POST /api/orgs/[id]", async () => {
    const viewer = await getViewer();
    if (!viewer) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
    const { id } = await params;
    const body = await readJson(request);
    if (!body.ok) return NextResponse.json({ error: body.error }, { status: body.status });
    const result = await performOrgAction(id, viewer, body.value);
    if (!result.ok) return NextResponse.json({ error: result.error, fieldErrors: result.fieldErrors }, { status: result.status });
    return NextResponse.json({ ok: true });
  });
