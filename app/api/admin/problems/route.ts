import { NextResponse } from "next/server";
import { readJson } from "@/lib/accounts/read-json";
import { isObject } from "@/lib/accounts/rules";
import { requireAdmin } from "@/lib/admin/guard";
import { createProblem, deleteProblem, listManagedProblems } from "@/lib/admin/repository";

export async function GET() {
  const admin = await requireAdmin();
  if ("denied" in admin) return admin.denied;
  return NextResponse.json({ problems: await listManagedProblems() });
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if ("denied" in admin) return admin.denied;
  const body = await readJson(request);
  if (!body.ok) return NextResponse.json({ error: body.error }, { status: body.status });
  const result = isObject(body.value) && body.value.action === "delete" ? await deleteProblem(body.value) : await createProblem(admin.viewer, body.value);
  if (!result.ok) return NextResponse.json({ error: result.error, fieldErrors: result.fieldErrors }, { status: result.status });
  return NextResponse.json({ ok: true });
}
