"use client";

import React from "react";
import { PixelBadge } from "@/components/retro/pixel-badge";
import { RotateCcw, XCircle } from "lucide-react";
import { DotIcon } from "@/components/retro/dot-icon";

export interface DemoControlsProps {
  onLoadSolved: () => void;
  onLoadIncorrect: () => void;
  onResetDemo: () => void;
  onPreviewAccepted: () => void;
  onPreviewWrongAnswer: () => void;
  demoState: "solved" | "incorrect" | "modified" | "idle";
}

export function DemoControls({
  onLoadSolved,
  onLoadIncorrect,
  onResetDemo,
  onPreviewAccepted,
  onPreviewWrongAnswer,
  demoState,
}: DemoControlsProps) {
  return (
    <div className="demo-controls-bar px-2 py-1 bg-[var(--color-surface)] border-2 border-[var(--color-accent)] text-[0.6875rem] font-mono flex flex-wrap items-center justify-between gap-2 shrink-0">
      <div className="flex items-center gap-2 flex-wrap">
        <PixelBadge variant="purple" bracketed className="text-[0.625rem] py-0 px-1 font-mono">
          DEV DEMO MODE
        </PixelBadge>
        <span className="text-[var(--color-text-muted)] text-[0.6875rem]">
          Simulate frontend results without running Piston sandbox:
        </span>
        {demoState === "modified" && (
          <span className="text-[var(--color-accent)] text-[0.625rem] italic">
            (Code modified — marked unevaluated until tested)
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          type="button"
          onClick={onLoadSolved}
          className="px-2 py-1 bg-[var(--color-canvas)] hover:bg-[var(--color-elevated)] border border-[var(--color-mint)] text-[var(--color-mint)] text-[0.6875rem] font-bold flex items-center gap-1 cursor-pointer transition-colors"
          title="Load correct Python solution: a + b"
        >
          <DotIcon name="circlePlay" size={13} aria-hidden="true" />
          <span>LOAD SOLVED</span>
        </button>

        <button
          type="button"
          onClick={onLoadIncorrect}
          className="px-2 py-1 bg-[var(--color-canvas)] hover:bg-[var(--color-elevated)] border border-[var(--color-pink)] text-[var(--color-pink)] text-[0.6875rem] font-bold flex items-center gap-1 cursor-pointer transition-colors"
          title="Load incorrect Python code: a - b"
        >
          <XCircle size={10} />
          <span>LOAD INCORRECT</span>
        </button>

        <button
          type="button"
          onClick={onPreviewAccepted}
          className="px-2 py-1 bg-[var(--color-canvas)] hover:bg-[var(--color-elevated)] border border-[var(--color-border)] hover:border-[var(--color-mint)] text-[var(--color-text-main)] hover:text-[var(--color-mint)] text-[0.6875rem] flex items-center gap-1 cursor-pointer transition-colors"
          title="Preview simulated Accepted verdict modal"
        >
          <DotIcon name="circleCheck" size={13} aria-hidden="true" />
          <span>PREVIEW ACCEPTED</span>
        </button>

        <button
          type="button"
          onClick={onPreviewWrongAnswer}
          className="px-2 py-1 bg-[var(--color-canvas)] hover:bg-[var(--color-elevated)] border border-[var(--color-border)] hover:border-[var(--color-pink)] text-[var(--color-text-main)] hover:text-[var(--color-pink)] text-[0.6875rem] flex items-center gap-1 cursor-pointer transition-colors"
          title="Preview simulated Wrong Answer verdict modal"
        >
          <XCircle size={10} />
          <span>PREVIEW WRONG ANSWER</span>
        </button>

        <button
          type="button"
          onClick={onResetDemo}
          className="px-2 py-1 bg-[var(--color-canvas)] hover:bg-[var(--color-elevated)] border border-[var(--color-border)] text-[var(--color-text-dim)] hover:text-[var(--color-text-main)] text-[0.6875rem] flex items-center gap-1 cursor-pointer transition-colors"
          title="Reset demo buffer and simulated outputs"
        >
          <RotateCcw size={10} />
          <span>RESET DEMO</span>
        </button>
      </div>
    </div>
  );
}
