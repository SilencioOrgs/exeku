"use client";

import { useRef, useState } from "react";
import type { ExecutionResult } from "@/types/execution";
import type { JudgingResult } from "@/lib/judge/judging-service";
import type { PreferredLanguage } from "@/types/profile";
import type { WorkspaceFile } from "@/types/draft";

/** POST JSON and fail loudly on any non-2xx reply, so `{ error }` bodies never pass as results. */
export async function postJson<T>(url: string, body: unknown, fetcher: typeof fetch = fetch): Promise<T> {
  const res = await fetcher(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || `Request failed (HTTP ${res.status}).`);
  return data as T;
}

interface Source { language: PreferredLanguage; sourceCode: string; files: WorkspaceFile[] }

/** Run and submit state for the workspace. Only real judge replies count as results. */
export function useJudge() {
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [judgingResult, setJudgingResult] = useState<JudgingResult | null>(null);
  const [isResultDemo, setIsResultDemo] = useState(false);
  // Bumped when the student moves on, so a late reply can't land on the wrong problem.
  const generation = useRef(0);

  const run = async (source: Source & { stdin: string; timeLimitMs: number }) => {
    const started = generation.current;
    setIsRunning(true);
    let result: ExecutionResult;
    try {
      result = await postJson<ExecutionResult>("/api/execute", source);
    } catch (err) {
      result = { status: "INTERNAL_ERROR", exitCode: null, stdout: "", stderr: err instanceof Error ? err.message : String(err), durationMs: 0 };
    }
    if (started !== generation.current) return;
    setExecutionResult(result);
    setIsRunning(false);
  };

  /** Resolves to null if the student left this problem before the verdict arrived. */
  const submit = async (problemId: string, source: Source): Promise<JudgingResult | null> => {
    const started = generation.current;
    setIsSubmitting(true);
    setIsResultDemo(false);
    let result: JudgingResult;
    try {
      result = await postJson<JudgingResult>("/api/judge", { problemId, ...source });
    } catch (err) {
      result = {
        problemId, language: source.language, overallVerdict: "INTERNAL_JUDGE_ERROR",
        passedTests: 0, totalTests: 0, scorePercentage: 0, maxDurationMs: 0, testResults: [],
        error: err instanceof Error ? err.message : String(err),
      };
    }
    if (started !== generation.current) return null;
    setJudgingResult(result);
    setIsSubmitting(false);
    return result;
  };

  const showDemoResult = (result: JudgingResult | null) => {
    setJudgingResult(result);
    setIsResultDemo(result !== null);
  };

  const reset = () => {
    generation.current += 1;
    setIsRunning(false);
    setIsSubmitting(false);
    setExecutionResult(null);
    setJudgingResult(null);
    setIsResultDemo(false);
  };

  return { isRunning, isSubmitting, executionResult, judgingResult, isResultDemo, run, submit, showDemoResult, reset, clearRun: () => setExecutionResult(null) };
}
