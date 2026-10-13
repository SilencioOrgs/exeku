import { NextResponse } from "next/server";
import { validateExecutionRequest } from "@/lib/execution/validation";
import { defaultJudgingService } from "@/lib/judge/judging-service";
import { QueueFullError } from "@/lib/execution/queue";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validation = validateExecutionRequest(body);

    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const result = await defaultJudgingService.runCode(validation.request);
    return NextResponse.json(result);
  } catch (err: unknown) {
    if (err instanceof QueueFullError) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }

    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
