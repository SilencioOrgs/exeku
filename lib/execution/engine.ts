import type { IExecutionAdapter } from "@/types/execution";
import { ExekuJudgeAdapter } from "@/lib/execution/exeku-judge-adapter";

export function createExecutionAdapter(env: Record<string, string | undefined> = process.env): IExecutionAdapter {
  return new ExekuJudgeAdapter({ baseUrl: env.JUDGE_SERVICE_URL, token: env.JUDGE_TOKEN });
}
