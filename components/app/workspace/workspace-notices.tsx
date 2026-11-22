"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlarmClock, AlertCircle, ShieldAlert, X } from "lucide-react";
import { cn } from "@/lib/utils";

import { JUDGE_SETUP_COMMAND } from "@/lib/execution/judge-help";
import { LANGUAGE_DISPLAY_NAMES } from "@/lib/workspace-defaults";
import type { ExecutionLanguage } from "@/types/execution";

export interface SandboxOfflineNoticeProps {
  /** Set when the judge answered but lacks some languages. */
  missingLanguages?: ExecutionLanguage[];
  onEnableDemo: () => void;
  onDismiss: () => void;
}

export function SandboxOfflineNotice({ missingLanguages = [], onEnableDemo, onDismiss }: SandboxOfflineNoticeProps) {
  const [copied, setCopied] = useState(false);
  const help = missingLanguages.length > 0
    ? `The judge is running but is missing ${missingLanguages.map((lang) => LANGUAGE_DISPLAY_NAMES[lang]).join(", ")}. Run this inside WSL or your judge VM.`
    : "Start the Exeku judge: run this inside WSL or your judge VM";
  return (
    <div role="status" className="flex min-w-0 shrink-0 flex-wrap items-center gap-2 rounded-[var(--radius-card)] border border-[var(--color-text-main)] px-2 py-1 text-xs">
      <AlertCircle size={14} aria-hidden="true" />
      <span className="min-w-0 flex-1 basis-56"><strong className="font-semibold">Sandbox service unavailable.</strong> {help}</span>
      <Button type="button" variant="outline" size="xs" title={JUDGE_SETUP_COMMAND} onClick={() => { void navigator.clipboard?.writeText(JUDGE_SETUP_COMMAND); setCopied(true); }}>
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

export function CodeSafetyNotice({ label, reason, fileName }: { label: string; reason: string; fileName?: string }) {
  return (
    <div
      role="alert"
      className="flex min-w-0 shrink-0 items-start gap-2 rounded-[var(--radius-card)] border border-[var(--color-pink)] bg-[var(--color-hard-bg)] px-3 py-2 text-xs text-[var(--color-pink)]"
    >
      <ShieldAlert size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
      <p className="min-w-0 flex-1 leading-snug">
        <strong className="font-semibold">
          {fileName ? `Blocked code in ${fileName}:` : "Blocked code:"} {label}.
        </strong>{" "}
        {reason}
      </p>
    </div>
  );
}

