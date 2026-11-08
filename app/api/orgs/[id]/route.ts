import { NextResponse } from "next/server";
import { readJson } from "@/lib/accounts/read-json";
import { getOrgDetail, performOrgAction } from "@/lib/orgs/repository";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Context) {
  const { id } = await params;
  const viewer = new URL(request.url).searchParams.get("viewer") ?? "";
  const detail = await getOrgDetail(id, viewer);
  if (!detail) return NextResponse.json({ error: "That organization doesn't exist." }, { status: 404 });
  return NextResponse.json(detail);
}

export async function POST(request: Request, { params }: Context) {
  const { id } = await params;
  const body = await readJson(request);
  if (body === undefined) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const result = await performOrgAction(id, body);
  if (!result.ok) return NextResponse.json({ error: result.error, fieldErrors: result.fieldErrors }, { status: result.status });
  return NextResponse.json({ ok: true });
}
