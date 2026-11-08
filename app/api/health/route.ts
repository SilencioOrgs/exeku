import { NextResponse } from "next/server";
import { createExecutionAdapter } from "@/lib/execution/engine";
import { globalExecutionQueue } from "@/lib/execution/queue";

export async function GET() {
  const adapter = createExecutionAdapter();
  const sandbox = await adapter.checkHealth();
  const queueStats = globalExecutionQueue.getStats();

  return NextResponse.json({
    status: "ok",
    sandbox,
    queue: queueStats,
    platform: "Exeku Online Judge (Local Preview)",
  });
}
