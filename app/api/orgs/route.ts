import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { withApiErrors } from "@/lib/api/route-handler";
import { listOrgs } from "@/lib/orgs/repository";

export const GET = (request: Request) =>
  withApiErrors("GET /api/orgs", async () => {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
    const campus = new URL(request.url).searchParams.get("campus") ?? undefined;
    return NextResponse.json({ orgs: await listOrgs(campus, userId) });
  });
