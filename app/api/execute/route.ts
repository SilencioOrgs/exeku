import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { readJson } from "@/lib/accounts/read-json";
import { MAX_BODY_BYTES, validateExecutionRequest } from "@/lib/execution/validation";
import { defaultJudgingService } from "@/lib/judge/judging-service";
import { clientFrom, QueueFullError } from "@/lib/execution/queue";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Sign in to run code." }, { status: 401 });
    }

    const body = await readJson(req, MAX_BODY_BYTES);
    if (!body.ok) {
      return NextResponse.json({ error: body.error }, { status: body.status });
    }

    const validation = validateExecutionRequest(body.value);

    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const result = await defaultJudgingService.runCode(validation.request, clientFrom(req.headers, userId));
    return NextResponse.json(result);
  } catch (err: unknown) {
    if (err instanceof QueueFullError) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }

    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
