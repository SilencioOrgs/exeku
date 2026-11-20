import { NextResponse } from "next/server";
import { readJson } from "@/lib/accounts/read-json";
import { isObject, text } from "@/lib/accounts/rules";
import { getViewer } from "@/lib/auth/viewer";
import { createClass, joinClassByCode, listClassesForViewer } from "@/lib/classes/repository";

export async function GET() {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  return NextResponse.json(await listClassesForViewer(viewer));
}

export async function POST(request: Request) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  const body = await readJson(request);
  if (!body.ok) return NextResponse.json({ error: body.error }, { status: body.status });
  const action = isObject(body.value) ? text(body.value, "action") : "";

  if (action === "join") {
    const result = await joinClassByCode(viewer, body.value);
    if (!result.ok) {
      return NextResponse.json({ error: result.error, fieldErrors: result.fieldErrors }, { status: result.status });
    }
    return NextResponse.json({ ok: true, classId: result.classId, className: result.className });
  }

  const result = await createClass(viewer, body.value);
  if (!result.ok) {
    return NextResponse.json({ error: result.error, fieldErrors: result.fieldErrors }, { status: result.status });
  }
  return NextResponse.json({ ok: true, id: result.id, inviteCode: result.inviteCode }, { status: 201 });
}
