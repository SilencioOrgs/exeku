"use client";

import React from "react";
import { PixelBadge } from "@/components/retro/pixel-badge";

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
    <div className="demo-controls-bar px-2 py-1 bg-[var(--color-surface)] border border-[var(--color-accent)] text-xs font-mono flex flex-nowrap items-center justify-between gap-2 shrink-0 overflow-x-auto">
      <div className="flex shrink-0 items-center gap-2 whitespace-nowrap">
        <PixelBadge variant="purple" bracketed className="text-xs py-0 px-1 font-mono">
          Dev demo mode
        </PixelBadge>
        <span className="text-[var(--color-text-muted)] text-xs">
          Simulate frontend results without running Piston sandbox:
        </span>
        {demoState === "modified" && (
          <span className="text-[var(--color-accent)] text-xs italic">
            (Code modified — marked unevaluated until tested)
          </span>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1.5 whitespace-nowrap">
        <button
          type="button"
          onClick={onLoadSolved}
          className="px-2 py-1 bg-[var(--color-canvas)] hover:bg-[var(--color-elevated)] border border-[var(--color-mint)] text-[var(--color-mint)] text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
          title="Load correct Python solution: a + b"
        >
          <DotIcon name="circlePlay" size={13} aria-hidden="true" />
          <span>Load solved</span>
        </button>

        <button
          type="button"
          onClick={onLoadIncorrect}
          className="px-2 py-1 bg-[var(--color-canvas)] hover:bg-[var(--color-elevated)] border border-[var(--color-pink)] text-[var(--color-pink)] text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
          title="Load incorrect Python code: a - b"
        >
          <DotIcon name="circleClose" size={10} />
          <span>Load incorrect</span>
        </button>

        <button
          type="button"
          onClick={onPreviewAccepted}
          className="px-2 py-1 bg-[var(--color-canvas)] hover:bg-[var(--color-elevated)] border border-[var(--color-border)] hover:border-[var(--color-mint)] text-[var(--color-text-main)] hover:text-[var(--color-mint)] text-xs flex items-center gap-1 cursor-pointer transition-colors"
          title="Preview simulated Accepted verdict modal"
        >
          <DotIcon name="circleCheck" size={13} aria-hidden="true" />
          <span>Preview accepted</span>
        </button>

        <button
          type="button"
          onClick={onPreviewWrongAnswer}
          className="px-2 py-1 bg-[var(--color-canvas)] hover:bg-[var(--color-elevated)] border border-[var(--color-border)] hover:border-[var(--color-pink)] text-[var(--color-text-main)] hover:text-[var(--color-pink)] text-xs flex items-center gap-1 cursor-pointer transition-colors"
          title="Preview simulated Wrong Answer verdict modal"
        >
          <DotIcon name="circleClose" size={10} />
          <span>Preview wrong answer</span>
        </button>

        <button
          type="button"
          onClick={onResetDemo}
          className="px-2 py-1 bg-[var(--color-canvas)] hover:bg-[var(--color-elevated)] border border-[var(--color-border)] text-[var(--color-text-dim)] hover:text-[var(--color-text-main)] text-xs flex items-center gap-1 cursor-pointer transition-colors"
          title="Reset demo buffer and simulated outputs"
        >
          <DotIcon name="arrowLeft" size={10} />
          <span>Reset demo</span>
        </button>
      </div>
    </div>
  );
}
