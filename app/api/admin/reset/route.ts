import { NextResponse } from "next/server";
import { readJson } from "@/lib/accounts/read-json";
import { requireAdmin } from "@/lib/admin/guard";
import { resetDatabase } from "@/lib/admin/repository";

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if ("denied" in admin) return admin.denied;
  const body = await readJson(request);
  if (!body.ok) return NextResponse.json({ error: body.error }, { status: body.status });
  const result = await resetDatabase(body.value);
  if (!result.ok) return NextResponse.json({ error: result.error, fieldErrors: result.fieldErrors }, { status: result.status });
  return NextResponse.json({ ok: true });
}
