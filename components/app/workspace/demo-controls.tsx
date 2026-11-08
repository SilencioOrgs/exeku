"use client";

import { Button } from "@/components/ui/button";
import { RotateCcw, X } from "lucide-react";

export interface DemoControlsProps {
  onLoadSolved: () => void;
  onLoadIncorrect: () => void;
  onResetDemo: () => void;
  onPreviewAccepted: () => void;
  onPreviewWrongAnswer: () => void;
  onExit: () => void;
}

/** Frontend-only demo for when no sandbox is running. Results it shows are labeled "Demo result". */
export function DemoControls({ onLoadSolved, onLoadIncorrect, onResetDemo, onPreviewAccepted, onPreviewWrongAnswer, onExit }: DemoControlsProps) {
  return (
    <div className="flex shrink-0 items-center gap-2 overflow-x-auto rounded-[var(--radius-card)] border border-dashed border-[var(--color-text-muted)] px-2 py-1.5 text-xs">
      <span className="shrink-0 font-medium">Demo mode</span>
      <span className="hidden shrink-0 text-[var(--color-text-muted)] md:inline">No sandbox needed. Results are simulated.</span>
      <div className="ml-auto flex shrink-0 items-center gap-1">
        <Button type="button" variant="outline" size="xs" onClick={onLoadSolved}>Load correct code</Button>
        <Button type="button" variant="outline" size="xs" onClick={onLoadIncorrect}>Load wrong code</Button>
        <Button type="button" variant="ghost" size="xs" onClick={onPreviewAccepted}>Preview accepted</Button>
        <Button type="button" variant="ghost" size="xs" onClick={onPreviewWrongAnswer}>Preview wrong answer</Button>
        <Button type="button" variant="ghost" size="xs" onClick={onResetDemo}><RotateCcw size={12} aria-hidden="true" />Reset</Button>
        <Button type="button" variant="ghost" size="icon-xs" onClick={onExit} aria-label="Turn off demo mode"><X size={12} aria-hidden="true" /></Button>
      </div>
    </div>
  );
}
