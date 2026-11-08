import type { IExecutionAdapter } from "@/types/execution";
import { ExekuJudgeAdapter } from "@/lib/execution/exeku-judge-adapter";
import { PistonAdapter } from "@/lib/execution/piston-adapter";

export type ExecutionEngine = "exeku" | "piston";

/** EXECUTION_ENGINE picks the sandbox. Default: the Exeku judge in judge/; "piston" keeps the old container. */
export function resolveExecutionEngine(env: Record<string, string | undefined> = process.env): ExecutionEngine {
  return env.EXECUTION_ENGINE?.trim().toLowerCase() === "piston" ? "piston" : "exeku";
}

export function createExecutionAdapter(env: Record<string, string | undefined> = process.env): IExecutionAdapter {
  return resolveExecutionEngine(env) === "piston"
    ? new PistonAdapter({ baseUrl: env.JUDGE_SERVICE_URL })
    : new ExekuJudgeAdapter({ baseUrl: env.JUDGE_SERVICE_URL, token: env.JUDGE_TOKEN });
}
