import { NextResponse } from "next/server";
import { readJson } from "@/lib/accounts/read-json";
import { checkSchoolAccount } from "@/lib/accounts/rules";
import { schoolDirectory } from "@/lib/accounts/school-directory";
import { withApiErrors } from "@/lib/api/route-handler";
import { getViewer } from "@/lib/auth/viewer";
import { db, must } from "@/lib/db/client";

// shortcut: campus_id is locked once set, but school email ownership is not verified by OTP yet; verify via email before public contests.
export const POST = (request: Request) =>
  withApiErrors("POST /api/account/school", async () => {
    const viewer = await getViewer();
    if (!viewer) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
    const body = await readJson(request);
    if (!body.ok) return NextResponse.json({ error: body.error }, { status: body.status });
    const checked = await checkSchoolAccount(body.value, schoolDirectory);
    if (!checked.ok) return NextResponse.json({ fieldErrors: checked.fieldErrors }, { status: 422 });
    const { email, age, school } = checked.account;
    if (viewer.campusId && (school.campusId ?? undefined) !== viewer.campusId) {
      return NextResponse.json({ error: "Your campus is already set. Contact an admin to change it." }, { status: 409 });
    }
    must(await db().from("profiles").update({ school_email: email, age, school, campus_id: school.campusId ?? null }).eq("user_id", viewer.id));
    return NextResponse.json({ account: checked.account });
  });
