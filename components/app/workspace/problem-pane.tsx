"use client";

import { useState } from "react";
import Link from "next/link";
import { PixelCard } from "@/components/retro/pixel-card";
import { PixelBadge } from "@/components/retro/pixel-badge";

import { DotIcon } from "@/components/retro/dot-icon";
import type { VisibleProblem } from "@/types/problem";

export interface ProblemPaneProps {
  problem: VisibleProblem | null;
  onUseCustomStdin: (sampleInput: string) => void;
  className?: string;
}

export function ProblemPane({
  problem,
  onUseCustomStdin,
  className = "",
}: ProblemPaneProps) {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const handleCopyInput = async (input: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(input);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 1500);
    } catch {
      // Fallback
    }
  };

  if (!problem) {
    return (
      <div className={`flex h-full min-h-0 items-start gap-2 border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-xs text-[var(--color-text-muted)] ${className}`}>
        <DotIcon name="file" size={14} aria-hidden="true" />
        <span>Free coding — select a <Link className="underline underline-offset-2" href="/app/challenges">problem</Link> when you are ready to submit.</span>
      </div>
    );
  }

  const diffVariant =
    problem.difficulty === "beginner"
      ? "mint"
      : problem.difficulty === "intermediate"
      ? "cyan"
      : "pink";

  return (
    <div
      className={`problem-pane flex flex-col h-full bg-[var(--color-surface)] border-2 border-[var(--color-border)] select-text overflow-hidden ${className}`}
    >
      {/* Pane Header */}
      <div className="p-3 bg-[var(--color-elevated)] border-b-2 border-[var(--color-border)] shrink-0 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-[0.625rem] text-[var(--color-accent)] font-bold tracking-wider uppercase">
            [PROBLEM]
          </span>
          <h2 className="font-heading text-base text-[var(--color-text-main)] truncate">
            {problem.title}_
          </h2>
          <PixelBadge variant={diffVariant} bracketed className="text-[0.625rem] py-0 px-1 font-mono">
            {problem.difficulty.toUpperCase()}
          </PixelBadge>
        </div>

        <Link
          href="/app/challenges"
          title="Pick a different problem"
          className="inline-flex items-center gap-1 text-[0.625rem] font-mono text-[var(--color-text-muted)] hover:text-[var(--color-accent)]"
        >
          CATALOG <DotIcon name="arrowUp" size={12} aria-hidden="true" />
        </Link>
      </div>

      {/* Resource Limits Telemetry */}
      <div className="px-3 py-1.5 bg-[var(--color-canvas)] border-b border-[var(--color-border)] flex items-center justify-between text-[0.625rem] font-mono text-[var(--color-text-muted)] shrink-0">
        <div className="flex items-center gap-1">
          <DotIcon name="alarm" size={11} className="text-[var(--color-accent)]" />
          <span>Time Limit: {problem.timeLimitMs}ms</span>
        </div>
        <div className="flex items-center gap-1">
          <DotIcon name="box" size={11} className="text-[var(--color-mint)]" />
          <span>Memory: {Math.round(problem.memoryLimitKb / 1000)}MB</span>
        </div>
      </div>

      {/* Scrollable Problem Statement Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs font-mono min-h-0">
        {/* Description */}
        <section className="space-y-1.5">
          <span className="font-heading text-xs text-[var(--color-accent)] block uppercase tracking-wider font-bold">
            DESCRIPTION
          </span>
          <p className="font-sans text-xs text-[var(--color-text-main)] leading-relaxed">
            {problem.description}
          </p>
        </section>

        {/* Input Specification */}
        <section className="space-y-1.5">
          <span className="font-heading text-xs text-[var(--color-accent)] block uppercase tracking-wider font-bold">
            INPUT SPECIFICATION
          </span>
          <div className="p-2.5 bg-[var(--color-canvas)] border border-[var(--color-border)] text-[var(--color-text-muted)] leading-relaxed">
            {problem.inputSpec}
          </div>
        </section>

        {/* Output Specification */}
        <section className="space-y-1.5">
          <span className="font-heading text-xs text-[var(--color-accent)] block uppercase tracking-wider font-bold">
            OUTPUT SPECIFICATION
          </span>
          <div className="p-2.5 bg-[var(--color-canvas)] border border-[var(--color-border)] text-[var(--color-text-muted)] leading-relaxed">
            {problem.outputSpec}
          </div>
        </section>

        {/* Constraints */}
        <section className="space-y-1.5">
          <span className="font-heading text-xs text-[var(--color-accent)] block uppercase tracking-wider font-bold">
            CONSTRAINTS
          </span>
          <ul className="list-disc list-inside p-2.5 bg-[var(--color-canvas)] border border-[var(--color-border)] text-[var(--color-text-muted)] space-y-1">
            {problem.constraints.map((c, idx) => (
              <li key={idx} className="text-[0.6875rem]">
                {c}
              </li>
            ))}
            <li className="text-[0.6875rem]">Execution time limit: {problem.timeLimitMs} milliseconds</li>
            <li className="text-[0.6875rem]">Evaluation memory ceiling: {Math.round(problem.memoryLimitKb / 1000)} MB</li>
          </ul>
        </section>

        {/* Sample Test Cases */}
        <section className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-heading text-xs text-[var(--color-accent)] uppercase tracking-wider font-bold">
              SAMPLE TEST CASES ({problem.sampleTestCases.length})
            </span>
            <span className="text-[0.625rem] text-[var(--color-text-dim)]">
              {problem.visibleTestCases.length} visible test cases
            </span>
          </div>

          {problem.sampleTestCases.map((sample, idx) => (
            <PixelCard
              key={idx}
              variant="default"
              className="p-3 bg-[var(--color-canvas)] border border-[var(--color-border)] space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-[var(--color-text-main)] text-[0.6875rem]">
                  Sample #{idx + 1}
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleCopyInput(sample.input, idx)}
                    className="text-[0.625rem] text-[var(--color-text-muted)] hover:text-[var(--color-accent)] flex items-center gap-1 cursor-pointer transition-colors px-1.5 py-0.5 border border-[var(--color-border)] bg-[var(--color-elevated)]"
                    title="Copy sample input to clipboard"
                  >
                    {copiedIdx === idx ? (
                      <>
                        <DotIcon name="circleCheck" size={13} aria-hidden="true" className="text-[var(--color-mint)]" />
                        <span className="text-[var(--color-mint)] font-bold">COPIED</span>
                      </>
                    ) : (
                      <>
                        <DotIcon name="file" size={10} />
                        <span>COPY INPUT</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => onUseCustomStdin(sample.input)}
                    className="text-[0.625rem] text-[var(--color-accent)] hover:underline cursor-pointer px-1.5 py-0.5 border border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10"
                    title="Load this input into Custom Stdin tab"
                  >
                    USE IN STDIN <DotIcon name="arrowRight" size={14} aria-hidden="true" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[0.6875rem]">
                <div>
                  <span className="text-[var(--color-text-dim)] block mb-0.5">Input:</span>
                  <pre className="p-1.5 bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-main)] overflow-x-auto whitespace-pre-wrap">
                    {sample.input || "(empty)"}
                  </pre>
                </div>
                <div>
                  <span className="text-[var(--color-text-dim)] block mb-0.5">Expected Output:</span>
                  <pre className="p-1.5 bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-mint)] overflow-x-auto whitespace-pre-wrap">
                    {sample.output.trim() || "(empty)"}
                  </pre>
                </div>
              </div>

              {sample.explanation && (
                <p className="text-[0.625rem] text-[var(--color-text-muted)] font-sans italic border-t border-[var(--color-border)]/50 pt-1.5">
                  Note: {sample.explanation}
                </p>
              )}
            </PixelCard>
          ))}
        </section>
      </div>
    </div>
  );
}
