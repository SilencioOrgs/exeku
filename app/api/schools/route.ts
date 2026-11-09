import { NextResponse } from "next/server";
import { readJson } from "@/lib/accounts/read-json";
import { checkNewSchool } from "@/lib/accounts/rules";
import { schoolDirectory } from "@/lib/accounts/school-directory";
import { getViewer } from "@/lib/auth/viewer";
import { db, must } from "@/lib/db/client";

export async function GET(request: Request) {
  const location = new URL(request.url).searchParams.get("location");
  if (location === null) return NextResponse.json({ locations: await schoolDirectory.listLocations() });
  return NextResponse.json({ schools: await schoolDirectory.listSchools(location) });
}

export async function POST(request: Request) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  const body = await readJson(request);
  if (!body.ok) return NextResponse.json({ error: body.error }, { status: body.status });
  const checked = await checkNewSchool(body.value, schoolDirectory);
  if (!checked.ok) return NextResponse.json({ fieldErrors: checked.fieldErrors }, { status: 422 });
  const { name, location, campus, emailDomain } = checked.school;
  must(await db().from("school_requests").upsert(
    { requested_by: viewer.id, name, location, campus: campus ?? null, email_domain: emailDomain },
    { onConflict: "requested_by,email_domain" },
  ));
  return NextResponse.json({ school: checked.school }, { status: 202 });
}
