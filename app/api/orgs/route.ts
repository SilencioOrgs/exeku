import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { listOrgs } from "@/lib/orgs/repository";

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  const campus = new URL(request.url).searchParams.get("campus") ?? undefined;
  return NextResponse.json({ orgs: await listOrgs(campus) });
}
