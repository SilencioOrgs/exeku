import { NextResponse } from "next/server";
import { readJson } from "@/lib/accounts/read-json";
import { getOrgDetail, performOrgAction } from "@/lib/orgs/repository";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Context) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const detail = await getOrgDetail(id, searchParams.get("viewer") ?? "", searchParams.get("campus") ?? undefined);
  if (!detail) return NextResponse.json({ error: "That organization doesn't exist." }, { status: 404 });
  return NextResponse.json(detail);
}

export async function POST(request: Request, { params }: Context) {
  const { id } = await params;
  const body = await readJson(request);
  if (!body.ok) return NextResponse.json({ error: body.error }, { status: body.status });
  const result = await performOrgAction(id, body.value);
  if (!result.ok) return NextResponse.json({ error: result.error, fieldErrors: result.fieldErrors }, { status: result.status });
  return NextResponse.json({ ok: true });
}
