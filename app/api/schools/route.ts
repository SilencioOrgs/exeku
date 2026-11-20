import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { readJson } from "@/lib/accounts/read-json";
import { checkNewSchool } from "@/lib/accounts/rules";
import { schoolDirectory } from "@/lib/accounts/school-directory";
import { withApiErrors } from "@/lib/api/route-handler";
import { getViewer } from "@/lib/auth/viewer";
import { db, must } from "@/lib/db/client";

export const GET = (request: Request) =>
  withApiErrors("GET /api/schools", async () => {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
    const location = new URL(request.url).searchParams.get("location");
    if (location === null) return NextResponse.json({ locations: await schoolDirectory.listLocations() });
    return NextResponse.json({ schools: await schoolDirectory.listSchools(location) });
  });

export const POST = (request: Request) =>
  withApiErrors("POST /api/schools", async () => {
    const viewer = await getViewer();
    if (!viewer) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
    const body = await readJson(request);
    if (!body.ok) return NextResponse.json({ error: body.error }, { status: body.status });
    const checked = await checkNewSchool(body.value, schoolDirectory);
    if (!checked.ok) return NextResponse.json({ fieldErrors: checked.fieldErrors }, { status: 422 });
    const { name, location, campus, emailDomain } = checked.school;

    const existing = must(
      await db()
        .from("school_requests")
        .select("id,status")
        .eq("requested_by", viewer.id)
        .eq("email_domain", emailDomain)
        .maybeSingle(),
    ) as { id: string; status: string } | null;

    if (existing?.status === "pending") {
      return NextResponse.json({ error: "You already have a pending request for this school domain." }, { status: 409 });
    }
    if (existing?.status === "approved") {
      return NextResponse.json({ error: "This school domain has already been approved." }, { status: 409 });
    }

    must(
      await db().from("school_requests").upsert(
        {
          requested_by: viewer.id,
          name,
          location,
          campus: campus ?? null,
          email_domain: emailDomain,
          status: "pending",
        },
        { onConflict: "requested_by,email_domain" },
      ),
    );
    return NextResponse.json({ school: checked.school }, { status: 202 });
  });
