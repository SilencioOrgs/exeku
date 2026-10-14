"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { PixelCard } from "@/components/retro/pixel-card";
import { PixelButton } from "@/components/retro/pixel-button";
import { PixelBadge } from "@/components/retro/pixel-badge";
import { Check, X, Clock, Terminal } from "lucide-react";
import type { JudgingResult, OverallVerdict } from "@/lib/judge/judging-service";
import type { VisibleProblem } from "@/types/problem";
import type { PreferredLanguage } from "@/types/profile";
import { LANGUAGE_DISPLAY_NAMES } from "@/lib/workspace-defaults";

export interface SubmitConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  problem: VisibleProblem;
  language: PreferredLanguage;
  isTimedActive?: boolean;
  formattedRemainingTime?: string;
}

export function SubmitConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  problem,
  language,
  isTimedActive = false,
  formattedRemainingTime = "",
}: SubmitConfirmModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="submit-confirm-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs"
    >
      <PixelCard
        variant="elevated"
        className="w-full max-w-md border-2 border-[var(--color-primary)] p-6 bg-[var(--color-surface)] [box-shadow:var(--shadow-btn)] space-y-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 border-2 border-[var(--color-primary)] bg-[var(--color-canvas)] flex items-center justify-center text-[var(--color-primary)] font-heading text-lg font-bold">
            ?
          </div>
          <div>
            <h3
              id="submit-confirm-title"
              className="font-heading text-lg text-[var(--color-text-main)]"
            >
              SUBMIT YOUR SOLUTION?_
            </h3>
            <span className="font-mono text-xs text-[var(--color-text-muted)]">
              {problem.title} &bull; {LANGUAGE_DISPLAY_NAMES[language]}
            </span>
          </div>
        </div>

        <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
          Your code will be evaluated against the complete test suite ({problem.visibleTestCases.length} visible test cases plus hidden evaluation tests).
        </p>

        {isTimedActive && (
          <div className="p-2.5 bg-[var(--color-canvas)] border border-[var(--color-accent)] font-mono text-xs flex items-center justify-between">
            <span className="text-[var(--color-accent)] font-bold">TIMED CHALLENGE ACTIVE:</span>
            <span className="text-[var(--color-mint)] font-bold">{formattedRemainingTime} remaining</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <PixelButton variant="ghost" size="sm" onClick={onClose} className="text-xs">
            CANCEL
          </PixelButton>
          <PixelButton
            variant="primary"
            size="sm"
            onClick={onConfirm}
            className="text-xs font-heading"
          >
            CONFIRM SUBMIT ✔
          </PixelButton>
        </div>
      </PixelCard>
    </div>
  );
}

export interface SubmissionEvaluatingModalProps {
  isOpen: boolean;
  problem: VisibleProblem;
  language: PreferredLanguage;
}

export function SubmissionEvaluatingModal({
  isOpen,
  problem,
  language,
}: SubmissionEvaluatingModalProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Submission evaluating in progress"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs"
    >
      <PixelCard
        variant="elevated"
        className="w-full max-w-sm border-2 border-[var(--color-mint)] p-6 bg-[var(--color-surface)] [box-shadow:var(--shadow-btn)] text-center space-y-4"
      >
        <div className="flex justify-center">
          <div className="w-12 h-12 border-4 border-[var(--color-mint)] border-t-transparent animate-spin" />
        </div>

        <div className="space-y-1">
          <h3 className="font-heading text-lg text-[var(--color-text-main)] animate-pulse">
            EVALUATING SOLUTION...
          </h3>
          <p className="font-mono text-xs text-[var(--color-text-muted)]">
            Testing {problem.title} against test cases in sandbox judge.
          </p>
        </div>

        <div className="text-[0.6875rem] font-mono text-[var(--color-text-dim)] bg-[var(--color-canvas)] p-2 border border-[var(--color-border)]">
          Target: {LANGUAGE_DISPLAY_NAMES[language]} runner &bull; Concurrency queue active
        </div>
      </PixelCard>
    </div>
  );
}

export interface SubmissionResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: JudgingResult | null;
  problem: VisibleProblem;
  isDemo?: boolean;
  onViewDetails?: () => void;
  nextProblemId?: string | null;
}

export function SubmissionResultModal({
  isOpen,
  onClose,
  result,
  problem,
  isDemo = false,
  onViewDetails,
  nextProblemId,
}: SubmissionResultModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !result) return null;

  const isAccepted = result.overallVerdict === "ACCEPTED";
  const isUnavailable = result.overallVerdict === "SERVICE_UNAVAILABLE";

  const getVerdictDescription = (verdict: OverallVerdict): string => {
    switch (verdict) {
      case "ACCEPTED":
        return "Congratulations! All test cases passed with exact output matching.";
      case "WRONG_ANSWER":
        return "One or more test cases returned output that did not match the expected answer.";
      case "COMPILATION_ERROR":
        return "The compiler could not build your source code. Check syntax and declarations.";
      case "RUNTIME_ERROR":
        return "Your program terminated with a non-zero exit code or unhandled exception.";
      case "TIME_LIMIT_EXCEEDED":
        return "Your program exceeded the allowed execution time limit.";
      case "SERVICE_UNAVAILABLE":
        return "The local sandbox container (Piston on port 2000) is unreachable. No evaluation could be performed.";
      case "INTERNAL_JUDGE_ERROR":
      default:
        return "An internal error occurred during automated judging evaluation.";
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="result-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs"
    >
      <PixelCard
        variant="elevated"
        className={`w-full max-w-md border-2 p-6 bg-[var(--color-surface)] [box-shadow:var(--shadow-btn)] space-y-4 ${
          isAccepted
            ? "border-[var(--color-mint)]"
            : isUnavailable
            ? "border-[var(--color-accent)]"
            : "border-[var(--color-pink)]"
        }`}
      >
        {/* Header with Visual Verdict Icon */}
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 border-2 flex items-center justify-center shrink-0 ${
              isAccepted
                ? "border-[var(--color-mint)] bg-[var(--color-mint)]/10 text-[var(--color-mint)]"
                : isUnavailable
                ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
                : "border-[var(--color-pink)] bg-[var(--color-pink)]/10 text-[var(--color-pink)]"
            }`}
          >
            {isAccepted ? (
              <Check size={24} strokeWidth={3} />
            ) : isUnavailable ? (
              <Terminal size={22} />
            ) : (
              <X size={24} strokeWidth={3} />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3
                id="result-modal-title"
                className={`font-heading text-xl font-bold ${
                  isAccepted
                    ? "text-[var(--color-mint)]"
                    : isUnavailable
                    ? "text-[var(--color-accent)]"
                    : "text-[var(--color-pink)]"
                }`}
              >
                {result.overallVerdict}_
              </h3>
              {isDemo && (
                <PixelBadge variant="purple" bracketed className="text-[0.625rem] py-0 px-1 font-mono">
                  DEMO SIMULATED
                </PixelBadge>
              )}
            </div>
            <span className="font-mono text-xs text-[var(--color-text-muted)] truncate block">
              {problem.title}
            </span>
          </div>
        </div>

        {/* Verdict Explanation */}
        <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
          {getVerdictDescription(result.overallVerdict)}
        </p>

        {/* Telemetry Stats */}
        {!isUnavailable && (
          <div className="grid grid-cols-3 gap-2 p-3 bg-[var(--color-canvas)] border border-[var(--color-border)] font-mono text-xs text-center">
            <div>
              <span className="text-[0.625rem] text-[var(--color-text-dim)] block">Passed Tests</span>
              <strong className="text-[var(--color-text-main)] text-sm">
                {result.passedTests} / {result.totalTests}
              </strong>
            </div>
            <div>
              <span className="text-[0.625rem] text-[var(--color-text-dim)] block">Score</span>
              <strong
                className={`text-sm ${
                  isAccepted ? "text-[var(--color-mint)]" : "text-[var(--color-pink)]"
                }`}
              >
                {result.scorePercentage}%
              </strong>
            </div>
            <div>
              <span className="text-[0.625rem] text-[var(--color-text-dim)] block">Max Time</span>
              <strong className="text-[var(--color-text-main)] text-sm">
                {result.maxDurationMs}ms
              </strong>
            </div>
          </div>
        )}

        {isUnavailable && (
          <div className="p-3 bg-[var(--color-canvas)] border border-[var(--color-pink)]/40 font-mono text-[0.6875rem] text-[var(--color-text-muted)] space-y-1">
            <div className="text-[var(--color-pink)] font-bold">SETUP INSTRUCTIONS:</div>
            <p>To run genuine untrusted code, launch the Piston container:</p>
            <code className="block p-1 bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-accent)] text-[0.625rem]">
              docker run -d -p 2000:2000 ghcr.io/engineerman/piston/piston
            </code>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between gap-2 pt-2 flex-wrap">
          {onViewDetails ? (
            <PixelButton
              variant="ghost"
              size="sm"
              onClick={() => {
                onClose();
                onViewDetails();
              }}
              className="text-xs"
            >
              VIEW TEST DETAILS &rarr;
            </PixelButton>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <PixelButton
              variant={isAccepted ? "secondary" : "ghost"}
              size="sm"
              onClick={onClose}
              className="text-xs"
            >
              {isAccepted ? "CONTINUE CODING" : "KEEP WORKING"}
            </PixelButton>

            {isAccepted && nextProblemId && (
              <Link href={`/app/workspace?problem=${encodeURIComponent(nextProblemId)}`}>
                <PixelButton variant="primary" size="sm" className="text-xs font-heading">
                  NEXT PROBLEM &rarr;
                </PixelButton>
              </Link>
            )}
          </div>
        </div>
      </PixelCard>
    </div>
  );
}

export interface TimeExpiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  submissionCount: number;
  lastVerdict?: string | null;
}

export function TimeExpiredModal({
  isOpen,
  onClose,
  submissionCount,
  lastVerdict,
}: TimeExpiredModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="expired-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs"
    >
      <PixelCard
        variant="elevated"
        className="w-full max-w-md border-2 border-[var(--color-pink)] p-6 bg-[var(--color-surface)] [box-shadow:var(--shadow-btn)] space-y-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 border-2 border-[var(--color-pink)] bg-[var(--color-canvas)] flex items-center justify-center text-[var(--color-pink)] font-heading text-xl font-bold">
            <Clock size={24} />
          </div>
          <div>
            <h3
              id="expired-modal-title"
              className="font-heading text-lg text-[var(--color-text-main)]"
            >
              TIME EXPIRED_
            </h3>
            <span className="font-mono text-xs text-[var(--color-pink)]">
              Challenge countdown reached 00:00
            </span>
          </div>
        </div>

        <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
          The allotted session time for this challenge has expired. Timed submissions are now frozen.
          Your current code draft has been preserved in your local buffer.
        </p>

        <div className="p-3 bg-[var(--color-canvas)] border border-[var(--color-border)] font-mono text-xs space-y-1">
          <div className="text-[var(--color-text-dim)]">Session Summary:</div>
          <div>Total Submissions Made: <strong>{submissionCount}</strong></div>
          {lastVerdict && (
            <div>Last Evaluated Verdict: <strong>{lastVerdict}</strong></div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <PixelButton variant="primary" size="sm" onClick={onClose} className="text-xs">
            VIEW WORKSPACE
          </PixelButton>
        </div>
      </PixelCard>
    </div>
  );
}
