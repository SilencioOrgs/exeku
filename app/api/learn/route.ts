import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { readJson } from "@/lib/accounts/read-json";
import { withApiErrors } from "@/lib/api/route-handler";
import { listLearnForViewer, recordLearnCompletion } from "@/lib/learn/repository";

export const GET = () =>
  withApiErrors("GET /api/learn", async () => {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
    return NextResponse.json(await listLearnForViewer({ id: userId }));
  });

export const POST = (request: Request) =>
  withApiErrors("POST /api/learn", async () => {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
    const body = await readJson(request);
    if (!body.ok) return NextResponse.json({ error: body.error }, { status: body.status });
    const result = await recordLearnCompletion({ id: userId }, body.value);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ ok: true, key: result.key });
  });
