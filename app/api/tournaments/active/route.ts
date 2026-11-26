import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { withApiErrors } from "@/lib/api/route-handler";
import { getActiveTournament } from "@/lib/tournaments/repository";

export const GET = () =>
  withApiErrors("GET /api/tournaments/active", async () => {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
    return NextResponse.json({ active: await getActiveTournament({ id: userId }) });
  });
