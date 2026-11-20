import { NextResponse } from "next/server";
import { readJson } from "@/lib/accounts/read-json";
import { getViewer } from "@/lib/auth/viewer";
import { getFacultyStatus, submitFacultyRequest } from "@/lib/roles/repository";

export async function GET() {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  return NextResponse.json(await getFacultyStatus(viewer));
}

export async function POST(request: Request) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  const body = await readJson(request);
  if (!body.ok) return NextResponse.json({ error: body.error }, { status: body.status });
  const result = await submitFacultyRequest(viewer, body.value);
  if (!result.ok) {
    return NextResponse.json({ error: result.error, fieldErrors: result.fieldErrors }, { status: result.status });
  }
  return NextResponse.json({ ok: true, request: result.request }, { status: 201 });
}
