"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlarmClock, AlertCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

import { JUDGE_START_COMMAND } from "@/lib/execution/judge-help";

export function SandboxOfflineNotice({ onEnableDemo, onDismiss }: { onEnableDemo: () => void; onDismiss: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <div role="status" className="flex min-w-0 shrink-0 items-center gap-2 rounded-[var(--radius-card)] border border-[var(--color-text-main)] px-2 py-1 text-xs">
      <AlertCircle size={14} aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate"><strong className="font-semibold">Sandbox service unavailable.</strong> Start the Exeku judge to run code.</span>
      <Button type="button" variant="outline" size="xs" onClick={() => { void navigator.clipboard?.writeText(JUDGE_START_COMMAND); setCopied(true); }}>
        {copied ? "Copied" : "Copy command"}
      </Button>
      <Button type="button" variant="ghost" size="xs" onClick={onEnableDemo}>Try demo mode</Button>
      <Button type="button" variant="ghost" size="icon-xs" aria-label="Dismiss sandbox notice" onClick={onDismiss}>
        <X size={12} aria-hidden="true" />
      </Button>
    </div>
  );
}

export interface ChallengeBarProps {
  formattedTime: string;
  isWarningTime: boolean;
  submissionCount: number;
  canFinish: boolean;
  onFinish: () => void;
  onForfeit: () => void;
}

export function ChallengeBar({ formattedTime, isWarningTime, submissionCount, canFinish, onFinish, onForfeit }: ChallengeBarProps) {
  return (
    <div className={cn("flex shrink-0 items-center justify-between gap-2 overflow-x-auto rounded-[var(--radius-card)] border px-2 py-1 text-xs", isWarningTime ? "border-[var(--color-text-main)] border-2" : "border-[var(--color-border)]")}>
      <div className="flex shrink-0 items-center gap-3">
        <span className="flex items-center gap-1.5 font-medium"><AlarmClock size={14} aria-hidden="true" />Timed challenge</span>
        <span className="font-code text-sm font-semibold" aria-live={isWarningTime ? "polite" : "off"}>{formattedTime}</span>
        {isWarningTime && <span className="font-medium">Less than 30 seconds left</span>}
        <span className="hidden text-[var(--color-text-muted)] md:inline">{submissionCount} {submissionCount === 1 ? "submission" : "submissions"}</span>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button type="button" size="xs" onClick={onFinish} disabled={!canFinish} title={canFinish ? "Finish the challenge" : "Submit at least once to finish"}>Finish</Button>
        <Button type="button" variant="outline" size="xs" onClick={onForfeit}>Forfeit</Button>
      </div>
    </div>
  );
}
