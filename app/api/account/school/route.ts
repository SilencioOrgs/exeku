import { NextResponse } from "next/server";
import { readJson } from "@/lib/accounts/read-json";
import { checkSchoolAccount } from "@/lib/accounts/rules";
import { schoolDirectory } from "@/lib/accounts/school-directory";

// shortcut: validates only and sends no verification email, so the address is unproven, save it and verify ownership here when Supabase lands.
export async function POST(request: Request) {
  const body = await readJson(request);
  if (body === undefined) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const checked = await checkSchoolAccount(body, schoolDirectory);
  if (!checked.ok) return NextResponse.json({ fieldErrors: checked.fieldErrors }, { status: 422 });
  return NextResponse.json({ account: checked.account });
}
