import { NextResponse } from "next/server";
import { readJson } from "@/lib/accounts/read-json";
import { checkNewSchool } from "@/lib/accounts/rules";
import { schoolDirectory } from "@/lib/accounts/school-directory";

export async function GET(request: Request) {
  const location = new URL(request.url).searchParams.get("location");
  if (location === null) return NextResponse.json({ locations: await schoolDirectory.listLocations() });
  return NextResponse.json({ schools: await schoolDirectory.listSchools(location) });
}

export async function POST(request: Request) {
  const body = await readJson(request);
  if (body === undefined) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const checked = await checkNewSchool(body, schoolDirectory);
  if (!checked.ok) return NextResponse.json({ fieldErrors: checked.fieldErrors }, { status: 422 });
  return NextResponse.json({ school: checked.school }, { status: 202 });
}
