import { NextResponse } from "next/server";
import { readJson } from "@/lib/accounts/read-json";
import { checkSchoolAccount } from "@/lib/accounts/rules";
import { schoolDirectory } from "@/lib/accounts/school-directory";
import { getViewer } from "@/lib/auth/viewer";
import { db, must } from "@/lib/db/client";

// shortcut: no verification email is sent, so the school address is unproven and campus-only events trust it, verify ownership here before real contests.
export async function POST(request: Request) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  const body = await readJson(request);
  if (!body.ok) return NextResponse.json({ error: body.error }, { status: body.status });
  const checked = await checkSchoolAccount(body.value, schoolDirectory);
  if (!checked.ok) return NextResponse.json({ fieldErrors: checked.fieldErrors }, { status: 422 });
  const { email, age, school } = checked.account;
  must(await db().from("profiles").update({ school_email: email, age, school, campus_id: school.campusId ?? null }).eq("user_id", viewer.id));
  return NextResponse.json({ account: checked.account });
}
