import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { readJson } from "@/lib/accounts/read-json";
import { checkSchoolAccount } from "@/lib/accounts/rules";
import { schoolDirectory } from "@/lib/accounts/school-directory";
import { withApiErrors } from "@/lib/api/route-handler";
import { getViewer } from "@/lib/auth/viewer";
import { db, must } from "@/lib/db/client";

export const POST = (request: Request) =>
  withApiErrors("POST /api/account/school", async () => {
    const viewer = await getViewer();
    if (!viewer) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
    const body = await readJson(request);
    if (!body.ok) return NextResponse.json({ error: body.error }, { status: body.status });
    const checked = await checkSchoolAccount(body.value, schoolDirectory);
    if (!checked.ok) return NextResponse.json({ fieldErrors: checked.fieldErrors }, { status: 422 });
    const { email, age, birthday, school } = checked.account;
    if (viewer.campusId && (school.campusId ?? undefined) !== viewer.campusId) {
      return NextResponse.json({ error: "Your campus is already set. Contact an admin to change it." }, { status: 409 });
    }

    // Verify Clerk ownership first so unverified callers cannot probe whether a school email belongs to another account.
    const clerkUser = await currentUser();
    const verifiedEmails = (clerkUser?.emailAddresses ?? [])
      .filter((entry) => entry.verification?.status === "verified")
      .map((entry) => entry.emailAddress.trim().toLowerCase());
    if (!verifiedEmails.includes(email)) {
      return NextResponse.json(
        {
          error: "Verify your school email with the 6-digit code sent to your inbox.",
          code: "VERIFICATION_REQUIRED",
          email,
        },
        { status: 403 },
      );
    }

    // Block another account from claiming the same school email, while allowing the same account to keep/re-verify it.
    const escapedEmail = email.replace(/[\\%_]/g, "\\$&");
    const takenByOther = must(
      await db()
        .from("profiles")
        .select("user_id")
        .ilike("school_email", escapedEmail)
        .neq("user_id", viewer.id)
        .limit(1)
        .maybeSingle(),
    ) as { user_id: string } | null;
    if (takenByOther) {
      return NextResponse.json(
        { error: "This school email is already linked to another Exeku account.", fieldErrors: { email: "This school email is already linked to another account." } },
        { status: 409 },
      );
    }

    const nextCampus = school.campusId ?? null;
    const runUpdate = (includeBirthday: boolean) => {
      const values = includeBirthday && birthday
        ? { school_email: email, age, birthday, school, campus_id: nextCampus }
        : { school_email: email, age, school, campus_id: nextCampus };
      let query = db()
        .from("profiles")
        .update(values)
        .eq("user_id", viewer.id);
      if (nextCampus) {
        query = query.or(`campus_id.is.null,campus_id.eq.${nextCampus}`);
      } else {
        query = query.is("campus_id", null);
      }
      return query.select("user_id").maybeSingle();
    };

    let { data: updated, error } = await runUpdate(Boolean(birthday));
    if (error && birthday && (error.code === "42703" || error.code === "PGRST204" || /birthday/i.test(error.message))) {
      ({ data: updated, error } = await runUpdate(false));
    }
    if (error?.code === "23505") {
      return NextResponse.json(
        { error: "This school email is already linked to another Exeku account.", fieldErrors: { email: "This school email is already linked to another account." } },
        { status: 409 },
      );
    }
    if (error) throw new Error(error.message);
    if (!updated) {
      return NextResponse.json({ error: "Your campus is already set. Contact an admin to change it." }, { status: 409 });
    }
    return NextResponse.json({ account: { ...checked.account, verified: true } });
  });
