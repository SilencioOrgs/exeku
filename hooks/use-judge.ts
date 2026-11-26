"use client";

import { useEffect, useRef, useState } from "react";
import type { ExecutionResult } from "@/types/execution";
import type { JudgingResult } from "@/lib/judge/judging-service";
import type { PreferredLanguage } from "@/types/profile";
import type { WorkspaceFile } from "@/types/draft";

/** POST JSON and fail loudly on any non-2xx reply, so `{ error }` bodies never pass as results. */
export async function postJson<T>(url: string, body: unknown, fetcher: typeof fetch = fetch, signal?: AbortSignal): Promise<T> {
  const res = await fetcher(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    ...(signal ? { signal } : {}),
  });
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
  // Bumped on each new call and reset, so superseded or post-navigation replies can never land.
  const generation = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => {
    generation.current += 1;
    abortRef.current?.abort();
  }, []);

  const nextController = () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    return { started: ++generation.current, controller };
  };

  /** Resolves to null if the student left this problem or superseded the request before output arrived. */
  const run = async (source: Source & { stdin: string; timeLimitMs: number }): Promise<ExecutionResult | null> => {
    const { started, controller } = nextController();
    setIsRunning(true);
    setIsSubmitting(false);
    let result: ExecutionResult;
    try {
      result = await postJson<ExecutionResult>("/api/execute", source, fetch, controller.signal);
    } catch (err) {
      if (started !== generation.current) return null;
      result = { status: "INTERNAL_ERROR", exitCode: null, stdout: "", stderr: err instanceof Error ? err.message : String(err), durationMs: 0 };
    }
    if (started !== generation.current) return null;
    setExecutionResult(result);
    setIsRunning(false);
    return result;
  };

  /** Resolves to null if the student left this problem or superseded the request before the verdict arrived. */
  const submit = async (problemId: string, source: Source): Promise<JudgingResult | null> => {
    const { started, controller } = nextController();
    setIsSubmitting(true);
    setIsRunning(false);
    setIsResultDemo(false);
    let result: JudgingResult;
    try {
      result = await postJson<JudgingResult>("/api/judge", { problemId, ...source }, fetch, controller.signal);
    } catch (err) {
      if (started !== generation.current) return null;
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

  const cancelRun = () => {
    generation.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    setIsRunning(false);
  };

  const reset = () => {
    generation.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    setIsRunning(false);
    setIsSubmitting(false);
    setExecutionResult(null);
    setJudgingResult(null);
    setIsResultDemo(false);
  };

  return { isRunning, isSubmitting, executionResult, judgingResult, isResultDemo, run, submit, showDemoResult, cancelRun, reset, clearRun: () => setExecutionResult(null) };
}
