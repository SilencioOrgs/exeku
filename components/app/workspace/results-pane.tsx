"use client";

import { Button } from "@/components/ui/button";
import { CheckCircle2, Database, Info, Loader2, Terminal, type LucideIcon } from "lucide-react";
import { VerdictBadge } from "./verdict-badge";
import type { ExecutionResult } from "@/types/execution";
import type { JudgingResult } from "@/lib/judge/judging-service";
import { cn } from "@/lib/utils";
import { isRealVerdict } from "@/lib/verdicts";

export type ResultsTab = "console" | "stdin" | "results";

export interface ResultsPaneProps {
  activeTab: ResultsTab;
  onTabChange: (tab: ResultsTab) => void;
  isRunning: boolean;
  isSubmitting: boolean;
  executionResult: ExecutionResult | null;
  judgingResult: JudgingResult | null;
  customStdin: string;
  onCustomStdinChange: (stdin: string) => void;
  filename: string;
  /** True only when the shown verdict is a demo simulation. */
  isResultDemo?: boolean;
  demoNote?: string | null;
}

const TABS: { id: ResultsTab; label: string; icon: LucideIcon }[] = [
  { id: "console", label: "Console", icon: Terminal },
  { id: "stdin", label: "Input", icon: Database },
  { id: "results", label: "Results", icon: CheckCircle2 },
];

function Output({ label, text }: { label: string; text: string }) {
  return (
    <div className="space-y-1">
      <span className="block text-xs font-medium text-[var(--color-text-muted)]">{label}</span>
      <pre className="font-code max-h-80 overflow-auto whitespace-pre-wrap rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5 text-xs text-[var(--color-text-main)]">{text}</pre>
    </div>
  );
}

function Spinner({ text }: { text: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-2.5 p-6 text-xs text-[var(--color-text-muted)]">
      <Loader2 size={16} className="animate-spin text-[var(--color-primary-text)]" aria-hidden="true" />
      <span>{text}</span>
    </div>
  );
}

export function ResultsPane({
  activeTab, onTabChange, isRunning, isSubmitting, executionResult, judgingResult,
  customStdin, onCustomStdinChange, filename, isResultDemo = false, demoNote = null,
}: ResultsPaneProps) {
  return (
    <div className="results-pane flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)]">
      <div role="tablist" aria-label="Output" className="workspace-output-header flex shrink-0 items-center gap-1 overflow-x-auto border-b border-[var(--color-border)] p-1">
        {TABS.map((tab) => (
          <Button
            key={tab.id}
            type="button"
            variant="ghost"
            size="sm"
            role="tab"
            id={`results-tab-${tab.id}`}
            aria-controls={`results-panel-${tab.id}`}
            aria-selected={activeTab === tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "h-7 gap-1.5 rounded-md px-2.5 text-xs font-medium",
              activeTab === tab.id ? "bg-[var(--color-elevated)] text-[var(--color-text-main)]" : "text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]",
            )}
          >
            <tab.icon size={13} aria-hidden="true" />
            {tab.label}
            {tab.id === "stdin" && customStdin.length > 0 && <span className="font-code text-[var(--color-text-muted)]">{customStdin.length}B</span>}
            {tab.id === "results" && judgingResult && <VerdictBadge status={judgingResult.overallVerdict} short className="py-0" />}
          </Button>
        ))}
      </div>

      {demoNote && (
        <p className="flex shrink-0 items-center gap-1.5 border-b border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text-muted)]">
          <Info size={12} aria-hidden="true" />{demoNote}
        </p>
      )}

      <div
        role="tabpanel"
        id={`results-panel-${activeTab}`}
        aria-labelledby={`results-tab-${activeTab}`}
        className="min-h-0 flex-1 overflow-y-auto bg-[var(--color-canvas)] p-3 text-sm"
      >
        {activeTab === "console" && (
          <div className="space-y-3">
            {!executionResult && !isRunning && (
              <p className="py-4 text-sm text-[var(--color-text-muted)]">
                Run <span className="font-code">{filename}</span> to see its output here. Press <kbd className="font-code">Ctrl</kbd>+<kbd className="font-code">Enter</kbd>.
              </p>
            )}
            {isRunning && <Spinner text="Running in the sandbox…" />}
            {executionResult && !isRunning && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] pb-2 text-xs text-[var(--color-text-muted)]">
                  <VerdictBadge status={executionResult.status} />
                  <span className="font-code">exit {executionResult.exitCode ?? "–"} · {executionResult.durationMs} ms</span>
                </div>
                {executionResult.compilerOutput && <Output label="Compiler output" text={executionResult.compilerOutput} />}
                {executionResult.stdout && <Output label="Output" text={executionResult.stdout} />}
                {executionResult.stderr && <Output label="Errors" text={executionResult.stderr} />}
                {!executionResult.stdout && !executionResult.stderr && !executionResult.compilerOutput && (
                  <p className="text-xs text-[var(--color-text-muted)]">The program printed nothing.</p>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === "stdin" && (
          <div className="flex h-full flex-col gap-2">
            <div className="flex shrink-0 items-center justify-between text-xs text-[var(--color-text-muted)]">
              <label htmlFor="workspace-stdin">Standard input for Run</label>
              <Button type="button" variant="ghost" size="xs" onClick={() => onCustomStdinChange("")}>Clear</Button>
            </div>
            <textarea
              id="workspace-stdin"
              value={customStdin}
              onChange={(e) => onCustomStdinChange(e.target.value)}
              placeholder="e.g. 10 20"
              spellCheck={false}
              className="font-code min-h-32 w-full flex-1 resize-none rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5 text-xs text-[var(--color-text-main)]"
            />
            <p className="shrink-0 text-xs text-[var(--color-text-muted)]">Tip: use “Use as input” on a sample in the problem panel.</p>
          </div>
        )}

        {activeTab === "results" && (
          <div className="space-y-3">
            {!judgingResult && !isSubmitting && (
              <p className="py-4 text-sm text-[var(--color-text-muted)]">Submit to judge your code against every test, including hidden ones.</p>
            )}
            {isSubmitting && <Spinner text="Judging your submission…" />}
            {judgingResult && !isSubmitting && (
              <div className="space-y-3">
                <div className="space-y-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <VerdictBadge status={judgingResult.overallVerdict} />
                    {isResultDemo && <span className="rounded-md border border-dashed border-[var(--color-text-muted)] px-1.5 text-xs text-[var(--color-text-muted)]">Demo result</span>}
                  </div>
                  {judgingResult.totalTests > 0 && isRealVerdict(judgingResult.overallVerdict) && (
                    <p className="font-code text-xs text-[var(--color-text-muted)]">
                      {judgingResult.passedTests}/{judgingResult.totalTests} tests passed · {judgingResult.scorePercentage}% · max {judgingResult.maxDurationMs} ms
                    </p>
                  )}
                  {judgingResult.error && <p className="text-xs text-[var(--color-text-main)]">{judgingResult.error}</p>}
                </div>

                {judgingResult.compilerOutput && <Output label="Compiler output" text={judgingResult.compilerOutput} />}

                <ol className="space-y-2">
                  {judgingResult.testResults.map((tc, idx) => (
                    <li key={tc.testCaseId || idx} className="space-y-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-[var(--color-text-main)]">
                          Test {idx + 1}{tc.isHidden && <span className="ml-1.5 text-[var(--color-text-muted)]">· hidden</span>}
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="font-code text-[var(--color-text-muted)]">{tc.durationMs} ms</span>
                          <VerdictBadge status={tc.verdict} short />
                        </span>
                      </div>
                      {tc.isHidden ? (
                        <p className="text-[var(--color-text-muted)]">Hidden test details are not shown.</p>
                      ) : (
                        <dl className="font-code grid grid-cols-1 gap-2 md:grid-cols-3">
                          <div><dt className="text-[var(--color-text-muted)]">Input</dt><dd className="whitespace-pre-wrap">{tc.input || "(empty)"}</dd></div>
                          <div><dt className="text-[var(--color-text-muted)]">Expected</dt><dd className="whitespace-pre-wrap">{tc.expectedOutput?.trim()}</dd></div>
                          <div><dt className="text-[var(--color-text-muted)]">Yours</dt><dd className={cn("whitespace-pre-wrap", !tc.passed && "underline decoration-dotted underline-offset-2")}>{tc.actualOutput?.trim() || "(no output)"}</dd></div>
                        </dl>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
