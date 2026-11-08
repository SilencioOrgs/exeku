"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { VerdictBadge } from "./verdict-badge";
import { isRealVerdict } from "@/lib/verdicts";
import type { JudgingResult } from "@/lib/judge/judging-service";
import { JUDGE_SETUP_COMMAND } from "@/lib/execution/judge-help";


const DESCRIPTIONS: Record<string, string> = {
  ACCEPTED: "Every test passed.",
  WRONG_ANSWER: "At least one test printed a different answer than expected.",
  COMPILATION_ERROR: "The compiler could not build your code. Check the compiler output.",
  RUNTIME_ERROR: "Your program crashed or exited with an error.",
  TIME_LIMIT_EXCEEDED: "Your program ran longer than the time limit.",
  MEMORY_LIMIT_EXCEEDED: "Your program used more memory than the limit.",
  SERVICE_UNAVAILABLE: "Sandbox service unavailable. Nothing was judged. Start the Exeku judge (see judge/README.md), then submit again.",
  INTERNAL_JUDGE_ERROR: "The judge could not finish. This is not counted against you.",
};

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  cancelLabel?: string;
  children?: ReactNode;
}

/** One confirm dialog for submit, reset, forfeit and finish. */
export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel, onConfirm, cancelLabel = "Cancel", children }: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{cancelLabel}</Button>
          <Button type="button" onClick={onConfirm}>{confirmLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export interface SubmissionResultDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: JudgingResult | null;
  problemTitle: string;
  isDemo: boolean;
  onViewDetails: () => void;
  nextProblemId: string | null;
}

export function SubmissionResultDialog({ open, onOpenChange, result, problemTitle, isDemo, onViewDetails, nextProblemId }: SubmissionResultDialogProps) {
  if (!result) return null;
  const accepted = result.overallVerdict === "ACCEPTED";
  const unavailable = result.overallVerdict === "SERVICE_UNAVAILABLE";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2">
            <VerdictBadge status={result.overallVerdict} />
            {isDemo && <span className="rounded-md border border-dashed border-[var(--color-text-muted)] px-1.5 text-xs text-[var(--color-text-muted)]">Demo result</span>}
          </div>
          <DialogTitle>{problemTitle}</DialogTitle>
          <DialogDescription>{DESCRIPTIONS[result.overallVerdict] ?? "The judge returned an unexpected result."}</DialogDescription>
        </DialogHeader>
        {result.error && !unavailable && <p className="text-sm text-[var(--color-text-main)]">{result.error}</p>}
        {result.totalTests > 0 && isRealVerdict(result.overallVerdict) && (
          <dl className="font-code grid grid-cols-3 gap-2 rounded-md border border-[var(--color-border)] p-3 text-center text-xs">
            <div><dt className="text-[var(--color-text-muted)]">Passed</dt><dd className="text-sm">{result.passedTests}/{result.totalTests}</dd></div>
            <div><dt className="text-[var(--color-text-muted)]">Score</dt><dd className="text-sm">{result.scorePercentage}%</dd></div>
            <div><dt className="text-[var(--color-text-muted)]">Max time</dt><dd className="text-sm">{result.maxDurationMs} ms</dd></div>
          </dl>
        )}
        {unavailable && (
          <code className="font-code block overflow-x-auto rounded-md border border-[var(--color-border)] bg-[var(--color-canvas)] p-2 text-xs">{JUDGE_SETUP_COMMAND}</code>
        )}
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => { onOpenChange(false); onViewDetails(); }}>View details</Button>
          <Button type="button" variant={accepted && nextProblemId ? "outline" : "default"} onClick={() => onOpenChange(false)}>Keep coding</Button>
          {accepted && nextProblemId && (
            <Link className={buttonVariants()} href={`/app/workspace?problem=${encodeURIComponent(nextProblemId)}`}>Next problem</Link>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function TimeExpiredDialog({ open, onOpenChange, submissionCount, lastVerdict }: { open: boolean; onOpenChange: (open: boolean) => void; submissionCount: number; lastVerdict?: string | null }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Time is up</DialogTitle>
          <DialogDescription>The challenge timer reached 00:00. Your code is still saved on this device.</DialogDescription>
        </DialogHeader>
        <dl className="font-code space-y-1 rounded-md border border-[var(--color-border)] p-3 text-xs">
          <div className="flex justify-between"><dt className="text-[var(--color-text-muted)]">Submissions</dt><dd>{submissionCount}</dd></div>
          {lastVerdict && <div className="flex items-center justify-between"><dt className="text-[var(--color-text-muted)]">Last verdict</dt><dd><VerdictBadge status={lastVerdict} short /></dd></div>}
        </dl>
        <DialogFooter><Button type="button" onClick={() => onOpenChange(false)}>Back to workspace</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
