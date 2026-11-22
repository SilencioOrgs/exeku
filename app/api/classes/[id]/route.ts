import { NextResponse } from "next/server";
import { readJson } from "@/lib/accounts/read-json";
import { withApiErrors } from "@/lib/api/route-handler";
import { getViewer } from "@/lib/auth/viewer";
import { getClassDetail, performClassAction } from "@/lib/classes/repository";

type Params = Promise<{ id: string }>;

export const GET = (_request: Request, { params }: { params: Params }) =>
  withApiErrors("GET /api/classes/[id]", async () => {
    const viewer = await getViewer();
    if (!viewer) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
    const { id } = await params;
    const detail = await getClassDetail(viewer, id);
    if (!detail) return NextResponse.json({ error: "Class not found." }, { status: 404 });
    return NextResponse.json(detail);
  });

export const POST = (request: Request, { params }: { params: Params }) =>
  withApiErrors("POST /api/classes/[id]", async () => {
    const viewer = await getViewer();
    if (!viewer) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
    const body = await readJson(request, 64 * 1024);
    if (!body.ok) return NextResponse.json({ error: body.error }, { status: body.status });
    const { id } = await params;
    const result = await performClassAction(viewer, id, body.value);
    if (!result.ok) {
      return NextResponse.json({ error: result.error, fieldErrors: result.fieldErrors }, { status: result.status });
    }
    return NextResponse.json({ ok: true, inviteCode: result.inviteCode, problemId: result.problemId });
  });
