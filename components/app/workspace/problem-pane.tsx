"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Copy, FileCode2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { VisibleProblem } from "@/types/problem";
import { DifficultyBadge } from "../difficulty-badge";

export interface ProblemPaneProps {
  problem: VisibleProblem | null;
  onUseCustomStdin: (sampleInput: string) => void;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-1.5">
      <h2 className="text-xs font-semibold text-[var(--color-text-main)]">{title}</h2>
      {children}
    </section>
  );
}

export function ProblemPane({ problem, onUseCustomStdin }: ProblemPaneProps) {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  if (!problem) {
    return (
      <div className="flex h-full min-h-0 items-start gap-2 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-sm text-[var(--color-text-muted)]">
        <FileCode2 size={14} aria-hidden="true" className="mt-0.5" />
        <span>Free coding. Pick a <Link className="underline underline-offset-2" href="/app/challenges">problem</Link> when you want to submit.</span>
      </div>
    );
  }

  const copy = async (input: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(input);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 1500);
    } catch { /* clipboard blocked; nothing to undo */ }
  };

  return (
    <div className="problem-pane flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="shrink-0 space-y-1 border-b border-[var(--color-border)] p-3">
        <div className="flex items-start justify-between gap-2">
          <h1 className="text-base font-semibold text-[var(--color-text-main)]">{problem.title}</h1>
          <Link href="/app/challenges" className="shrink-0 text-xs text-[var(--color-text-muted)] underline-offset-2 hover:text-[var(--color-text-main)] hover:underline">All problems</Link>
        </div>
        <p className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
          <DifficultyBadge difficulty={problem.difficulty} />
          <span className="font-code">{problem.timeLimitMs} ms · {Math.round(problem.memoryLimitKb / 1000)} MB</span>
        </p>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3 text-sm text-[var(--color-text-main)]">
        <p className="leading-relaxed">{problem.description}</p>
        <Section title="Input"><p className="text-[var(--color-text-muted)]">{problem.inputSpec}</p></Section>
        <Section title="Output"><p className="text-[var(--color-text-muted)]">{problem.outputSpec}</p></Section>
        <Section title="Constraints">
          <ul className="list-disc space-y-0.5 pl-4 text-[var(--color-text-muted)]">
            {problem.constraints.map((c, idx) => <li key={idx}>{c}</li>)}
          </ul>
        </Section>

        <Section title={`Samples (${problem.sampleTestCases.length})`}>
          <div className="space-y-2">
            {problem.sampleTestCases.map((sample, idx) => (
              <div key={idx} className="space-y-2 rounded-md border border-[var(--color-border)] bg-[var(--color-canvas)] p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium">Sample {idx + 1}</span>
                  <div className="flex gap-1">
                    <Button type="button" variant="ghost" size="xs" onClick={() => copy(sample.input, idx)}>
                      {copiedIdx === idx ? <CheckCircle2 size={12} aria-hidden="true" /> : <Copy size={12} aria-hidden="true" />}
                      {copiedIdx === idx ? "Copied" : "Copy"}
                    </Button>
                    <Button type="button" variant="outline" size="xs" onClick={() => onUseCustomStdin(sample.input)}>
                      Use as input
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div>
                    <span className="mb-0.5 block text-xs text-[var(--color-text-muted)]">Input</span>
                    <pre className="font-code overflow-x-auto whitespace-pre-wrap rounded border border-[var(--color-border)] bg-[var(--color-surface)] p-1.5 text-xs">{sample.input || "(empty)"}</pre>
                  </div>
                  <div>
                    <span className="mb-0.5 block text-xs text-[var(--color-text-muted)]">Expected output</span>
                    <pre className="font-code overflow-x-auto whitespace-pre-wrap rounded border border-[var(--color-border)] bg-[var(--color-surface)] p-1.5 text-xs">{sample.output.trim() || "(empty)"}</pre>
                  </div>
                </div>
                {sample.explanation && <p className="text-xs text-[var(--color-text-muted)]">{sample.explanation}</p>}
              </div>
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}
