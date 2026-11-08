import { NextResponse } from "next/server";
import { listOrgs } from "@/lib/orgs/repository";

export async function GET(request: Request) {
  const campus = new URL(request.url).searchParams.get("campus") ?? undefined;
  return NextResponse.json({ orgs: await listOrgs(campus) });
}
