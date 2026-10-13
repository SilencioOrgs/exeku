import { NextResponse } from "next/server";
import { PistonAdapter } from "@/lib/execution/piston-adapter";
import { globalExecutionQueue } from "@/lib/execution/queue";

export async function GET() {
  const adapter = new PistonAdapter();
  const sandbox = await adapter.checkHealth();
  const queueStats = globalExecutionQueue.getStats();

  return NextResponse.json({
    status: "ok",
    sandbox,
    queue: queueStats,
    platform: "Exeku Online Judge (Local Preview)",
  });
}
