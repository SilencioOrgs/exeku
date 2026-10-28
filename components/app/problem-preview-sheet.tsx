"use client";

import { useEffect, useState } from "react";
import { AlertCircle, LoaderCircle, Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import type { ProblemSummary, VisibleProblem } from "@/types/problem";

interface ProblemPreviewSheetProps {
  problem: ProblemSummary | null;
  onClose: () => void;
  onSolve: (problem: ProblemSummary) => void;
}

type PreviewState =
  | { problemId: string; status: "ready"; detail: VisibleProblem }
  | { problemId: string; status: "error" };

function difficultyVariant(difficulty: ProblemSummary["difficulty"]) {
  if (difficulty === "beginner") return "success" as const;
  if (difficulty === "intermediate") return "warning" as const;
  return "destructive" as const;
}

export function ProblemPreviewSheet({ problem, onClose, onSolve }: ProblemPreviewSheetProps) {
  const [previewState, setPreviewState] = useState<PreviewState | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const problemId = problem?.id;
  const currentState = problemId && previewState?.problemId === problemId ? previewState : null;
  const detail = currentState?.status === "ready" ? currentState.detail : null;

  useEffect(() => {
    if (!problemId) return;
    const controller = new AbortController();
    fetch(`/api/problems/${encodeURIComponent(problemId)}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Problem details are unavailable.");
        return response.json() as Promise<VisibleProblem>;
      })
      .then((data) => {
        if (!controller.signal.aborted) setPreviewState({ problemId, status: "ready", detail: data });
      })
      .catch(() => {
        if (!controller.signal.aborted) setPreviewState({ problemId, status: "error" });
      });
    return () => controller.abort();
  }, [problemId, retryToken]);

  return (
    <Sheet open={Boolean(problem)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent side="right" className="w-[min(44rem,96vw)] max-w-none gap-0 overflow-y-auto border-l border-[var(--color-border)] bg-[var(--color-surface)] p-0">
        <div className="sticky top-0 z-10 space-y-2 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4 pr-14">
          <div className="flex flex-wrap items-center gap-2">
            <SheetTitle className="text-lg font-semibold tracking-tight">{detail?.title ?? problem?.title ?? "Problem preview"}</SheetTitle>
            {problem && <Badge variant={difficultyVariant(problem.difficulty)}>{problem.difficulty}</Badge>}
            {problem && <Badge variant="outline">{problem.category}</Badge>}
          </div>
          <SheetDescription>Problem statement and public sample cases.</SheetDescription>
        </div>

        {!problem ? null : !currentState ? (
          <div role="status" className="flex min-h-44 items-center justify-center gap-2 px-5 text-sm text-[var(--color-text-muted)]">
            <LoaderCircle size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> Loading problem statement…
          </div>
        ) : currentState.status === "error" ? (
          <div className="flex min-h-44 flex-col items-center justify-center gap-3 px-5 text-center">
            <AlertCircle size={20} className="text-[var(--color-text-muted)]" aria-hidden="true" />
            <p className="text-sm text-[var(--color-text-muted)]">The problem statement could not be loaded.</p>
            <Button type="button" variant="outline" size="sm" onClick={() => setRetryToken((value) => value + 1)}>Try again</Button>
          </div>
        ) : (
          <div className="space-y-6 px-5 py-5 pb-24">
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Description</h3>
              <p className="whitespace-pre-line text-sm leading-6 text-[var(--color-text-muted)]">{detail.description}</p>
            </section>

            <div className="grid gap-4 sm:grid-cols-2">
              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Input format</h3>
                <p className="rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-elevated)] p-3 text-sm leading-5 text-[var(--color-text-muted)]">{detail.inputSpec}</p>
              </section>
              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Output format</h3>
                <p className="rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-elevated)] p-3 text-sm leading-5 text-[var(--color-text-muted)]">{detail.outputSpec}</p>
              </section>
            </div>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Constraints</h3>
              {detail.constraints.length > 0
                ? <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--color-text-muted)]">{detail.constraints.map((constraint) => <li key={constraint}>{constraint}</li>)}</ul>
                : <p className="text-sm text-[var(--color-text-muted)]">No additional constraints.</p>}
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Sample test cases</h3>
              {detail.sampleTestCases.map((sample, index) => (
                <div key={`${problem.id}-sample-${index}`} className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)]">
                  <div className="border-b border-[var(--color-border)] bg-[var(--color-elevated)] px-3 py-2 text-xs font-medium">Sample {index + 1}</div>
                  <div className="grid gap-3 p-3 sm:grid-cols-2">
                    <div className="min-w-0 space-y-1">
                      <p className="text-xs font-medium text-[var(--color-text-muted)]">Input</p>
                      <pre className="min-h-10 overflow-x-auto whitespace-pre-wrap break-words rounded-md bg-[var(--color-canvas)] p-2 font-mono text-xs">{sample.input || "(no input)"}</pre>
                    </div>
                    <div className="min-w-0 space-y-1">
                      <p className="text-xs font-medium text-[var(--color-text-muted)]">Output</p>
                      <pre className="min-h-10 overflow-x-auto whitespace-pre-wrap break-words rounded-md bg-[var(--color-canvas)] p-2 font-mono text-xs">{sample.output}</pre>
                    </div>
                  </div>
                  {sample.explanation && <p className="border-t border-[var(--color-border)] px-3 py-2 text-xs leading-5 text-[var(--color-text-muted)]">{sample.explanation}</p>}
                </div>
              ))}
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Supported languages</h3>
              <div className="flex flex-wrap gap-2">{detail.supportedLanguages.map((language) => <Badge key={language} variant="outline">{language === "cpp" ? "C++" : language === "c" ? "C" : language === "java" ? "Java" : "Python 3"}</Badge>)}</div>
            </section>
          </div>
        )}

        {problem && <div className="fixed bottom-0 right-0 z-10 flex w-[min(44rem,96vw)] justify-end border-t border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <Button type="button" onClick={() => onSolve(problem)}><Play size={15} aria-hidden="true" /> Solve problem</Button>
        </div>}
      </SheetContent>
    </Sheet>
  );
}
