import { NextResponse } from "next/server";
import { createExecutionAdapter } from "@/lib/execution/engine";
import { globalExecutionQueue } from "@/lib/execution/queue";
import type { SandboxHealth } from "@/types/execution";

const HEALTH_CACHE_MS = 2000;
let cachedHealth: { value: SandboxHealth; expiresAt: number } | null = null;

async function getSandboxHealth(): Promise<SandboxHealth> {
  const now = Date.now();
  if (cachedHealth && now < cachedHealth.expiresAt) return cachedHealth.value;
  const raw = await createExecutionAdapter().checkHealth();
  const safe: SandboxHealth = raw.error
    ? { ...raw, error: raw.error.startsWith("HTTP ") ? raw.error : "Judge sandbox unreachable." }
    : raw;
  cachedHealth = { value: safe, expiresAt: now + HEALTH_CACHE_MS };
  return safe;
}

export async function GET() {
  const sandbox = await getSandboxHealth();
  const queueStats = globalExecutionQueue.getStats();

  return NextResponse.json({
    status: "ok",
    sandbox,
    queue: queueStats,
    platform: "Exeku Online Judge (Local Preview)",
  });
}
