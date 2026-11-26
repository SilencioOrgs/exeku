"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  CirclePlay,
  CornerDownLeft,
  Database,
  Info,
  Loader2,
  RotateCcw,
  Save,
  Square,
  Terminal,
  type LucideIcon,
} from "lucide-react";
import { VerdictBadge } from "./verdict-badge";
import type { ExecutionResult } from "@/types/execution";
import type { JudgingResult } from "@/lib/judge/judging-service";
import { cn } from "@/lib/utils";
import { isRealVerdict } from "@/lib/verdicts";

export type ResultsTab = "console" | "stdin" | "results";

export interface InteractiveTranscriptEntry {
  prompt: string;
  input: string;
}

export interface QuickSample {
  label: string;
  input: string;
}

export type ConsoleStdinState =
  | { phase: "idle" }
  | {
      phase: "prompt";
      draft: string;
    }
  | {
      phase: "interactive";
      entries: InteractiveTranscriptEntry[];
      pendingPrompt: string;
      rawStdout: string;
      stdinSoFar: string;
      lineDraft: string;
      steps: number;
      lastResult: ExecutionResult;
      /** True when the run started with pre-filled Input tab text and asked for more lines. */
      continuedFromSavedInput?: boolean;
    }
  | {
      phase: "done";
      kind: "interactive" | "prompt";
      entries: InteractiveTranscriptEntry[];
      trailingOutput: string;
      stdinUsed: string;
      prefixBroken: boolean;
    };

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
  stdinState?: ConsoleStdinState;
  quickSamples?: QuickSample[];
  lastAdHocStdin?: string;
  onPromptDraftChange?: (draft: string) => void;
  onPromptRun?: (stdin: string) => void;
  onPromptCancel?: () => void;
  onInteractiveLineChange?: (line: string) => void;
  onInteractiveSubmit?: (entry: string) => void;
  onInteractiveEndInput?: () => void;
  onInteractiveStop?: () => void;
  onRunWithSample?: (sampleInput: string) => void;
  onSaveStdinToTab?: (stdin: string) => void;
  onRunNewInput?: () => void;
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

function splitLastLine(text: string): { before: string; activeLine: string } {
  const idx = text.lastIndexOf("\n");
  if (idx === -1) return { before: "", activeLine: text };
  return { before: text.slice(0, idx + 1), activeLine: text.slice(idx + 1) };
}

export function ResultsPane({
  activeTab, onTabChange, isRunning, isSubmitting, executionResult, judgingResult,
  customStdin, onCustomStdinChange, filename, isResultDemo = false, demoNote = null,
  stdinState = { phase: "idle" }, quickSamples = [], lastAdHocStdin = "",
  onPromptDraftChange, onPromptRun, onPromptCancel,
  onInteractiveLineChange, onInteractiveSubmit, onInteractiveEndInput, onInteractiveStop,
  onRunWithSample, onSaveStdinToTab, onRunNewInput,
}: ResultsPaneProps) {
  const promptTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const interactiveInputRef = useRef<HTMLInputElement | null>(null);
  const interactiveStepCount = stdinState.phase === "interactive" ? stdinState.steps : -1;

  // Focus the inline console input automatically whenever the program asks for stdin.
  useEffect(() => {
    if (activeTab !== "console" || isRunning) return;
    if (stdinState.phase === "prompt") {
      promptTextareaRef.current?.focus();
    } else if (stdinState.phase === "interactive") {
      interactiveInputRef.current?.focus();
    }
  }, [activeTab, isRunning, stdinState.phase, interactiveStepCount]);

  const waitingForInput = stdinState.phase === "prompt" || stdinState.phase === "interactive";

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
            {tab.id === "console" && waitingForInput && (
              <>
                <span aria-hidden="true" className="size-1.5 rounded-full bg-[var(--color-primary)]" />
                <span className="sr-only">Waiting for input</span>
              </>
            )}
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
            {stdinState.phase === "idle" && customStdin.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 text-xs text-[var(--color-text-muted)]">
                <span>
                  Using saved input (<span className="font-code">{customStdin.length}B</span>)
                </span>
                <div className="flex items-center gap-1">
                  <Button type="button" variant="ghost" size="xs" onClick={() => onTabChange("stdin")}>Edit</Button>
                  <Button type="button" variant="ghost" size="xs" onClick={() => onCustomStdinChange("")}>Clear</Button>
                </div>
              </div>
            )}

            {/* Upfront inline stdin prompt for C/C++/batch stdin programs */}
            {stdinState.phase === "prompt" && (
              <div className="space-y-2.5 rounded-md border border-[var(--color-primary)]/40 bg-[var(--color-surface)] p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-medium text-[var(--color-text-main)]">
                    <span aria-hidden="true" className="size-2 rounded-full bg-[var(--color-primary)]" />
                    <label htmlFor="console-run-stdin">Program expects input</label>
                  </div>
                  {onPromptCancel && (
                    <Button type="button" variant="ghost" size="xs" onClick={onPromptCancel}>Cancel</Button>
                  )}
                </div>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Enter standard input for <span className="font-code">{filename}</span> below, then run.
                </p>

                {(quickSamples.length > 0 || lastAdHocStdin.length > 0) && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {quickSamples.map((sample, idx) => (
                      <Button
                        key={`${sample.label}-${idx}`}
                        type="button"
                        variant="outline"
                        size="xs"
                        disabled={isRunning}
                        onClick={() => onRunWithSample?.(sample.input)}
                      >
                        {sample.label}
                      </Button>
                    ))}
                    {lastAdHocStdin.length > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        disabled={isRunning}
                        onClick={() => onPromptDraftChange?.(lastAdHocStdin)}
                      >
                        <RotateCcw size={11} aria-hidden="true" /> Last input
                      </Button>
                    )}
                  </div>
                )}

                <textarea
                  ref={promptTextareaRef}
                  id="console-run-stdin"
                  value={stdinState.draft}
                  onChange={(e) => onPromptDraftChange?.(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                      e.preventDefault();
                      e.stopPropagation();
                      onPromptRun?.(stdinState.draft);
                    }
                  }}
                  placeholder="Type input here (one or more lines)…"
                  spellCheck={false}
                  rows={4}
                  className="font-code w-full resize-y rounded-md border border-[var(--color-border)] bg-[var(--color-canvas)] p-2.5 text-xs text-[var(--color-text-main)] outline-none focus:border-[var(--color-ring)]"
                />

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      loading={isRunning}
                      loadingText="Running…"
                      onClick={() => onPromptRun?.(stdinState.draft)}
                    >
                      <CirclePlay size={13} aria-hidden="true" /> Run
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isRunning}
                      onClick={() => onPromptRun?.("")}
                    >
                      Run empty
                    </Button>
                  </div>
                  <span className="text-xs text-[var(--color-text-muted)]">
                    <kbd className="font-code">Ctrl</kbd>+<kbd className="font-code">Enter</kbd> to run
                  </span>
                </div>
              </div>
            )}

            {/* Live interactive terminal for Python input() / Java Scanner */}
            {stdinState.phase === "interactive" && (() => {
              const { before, activeLine } = splitLastLine(stdinState.pendingPrompt);
              return (
                <div className="space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] pb-2 text-xs">
                    <span role="status" className="flex items-center gap-2 font-medium text-[var(--color-text-main)]">
                      {isRunning ? (
                        <>
                          <Loader2 size={13} className="animate-spin text-[var(--color-primary-text)]" aria-hidden="true" />
                          Running…
                        </>
                      ) : (
                        <>
                          <span aria-hidden="true" className="size-2 animate-pulse rounded-full bg-[var(--color-primary)]" />
                          Waiting for input
                        </>
                      )}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        disabled={isRunning}
                        onClick={() => onInteractiveEndInput?.()}
                        title="Finish input and show the program's end-of-input output"
                      >
                        End input
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        onClick={() => onInteractiveStop?.()}
                      >
                        <Square size={11} aria-hidden="true" /> Stop
                      </Button>
                    </div>
                  </div>

                  {stdinState.continuedFromSavedInput && (
                    <p className="text-xs text-[var(--color-text-muted)]">
                      Your saved input was read, and the program asked for another line.
                    </p>
                  )}

                  <div
                    className="font-code max-h-80 overflow-auto rounded-md border border-[var(--color-primary)]/40 bg-[var(--color-surface)] p-2.5 text-xs leading-relaxed text-[var(--color-text-main)]"
                    onClick={() => interactiveInputRef.current?.focus()}
                  >
                    {stdinState.entries.map((entry, idx) => (
                      <span key={idx} className="whitespace-pre-wrap">
                        {entry.prompt}
                        <span className="font-medium text-[var(--color-primary-text)]">{entry.input}</span>
                        {"\n"}
                      </span>
                    ))}
                    {before && <span className="whitespace-pre-wrap">{before}</span>}
                    <div className="flex items-baseline gap-1">
                      {activeLine ? (
                        <span className="whitespace-pre-wrap">{activeLine}</span>
                      ) : (
                        <span aria-hidden="true" className="select-none text-[var(--color-primary-text)]">›</span>
                      )}
                      <input
                        ref={interactiveInputRef}
                        type="text"
                        aria-label="Standard input line"
                        value={stdinState.lineDraft}
                        disabled={isRunning}
                        onChange={(e) => onInteractiveLineChange?.(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
                            e.preventDefault();
                            e.stopPropagation();
                            if (!isRunning) onInteractiveSubmit?.(stdinState.lineDraft);
                          }
                        }}
                        onPaste={(e) => {
                          const pasted = e.clipboardData.getData("text");
                          if (pasted.includes("\n")) {
                            e.preventDefault();
                            if (!isRunning) onInteractiveSubmit?.(`${stdinState.lineDraft}${pasted}`);
                          }
                        }}
                        placeholder={activeLine ? "" : "Type input and press Enter…"}
                        spellCheck={false}
                        autoComplete="off"
                        className="font-code min-w-[6ch] flex-1 bg-transparent text-xs font-medium text-[var(--color-primary-text)] outline-none placeholder:font-normal placeholder:text-[var(--color-text-muted)] disabled:opacity-60"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Button
                        type="button"
                        size="xs"
                        loading={isRunning}
                        loadingText="Sending…"
                        onClick={() => onInteractiveSubmit?.(stdinState.lineDraft)}
                      >
                        <CornerDownLeft size={12} aria-hidden="true" /> Send
                      </Button>
                      {quickSamples.map((sample, idx) => (
                        <Button
                          key={`${sample.label}-${idx}`}
                          type="button"
                          variant="outline"
                          size="xs"
                          disabled={isRunning}
                          onClick={() => onRunWithSample?.(sample.input)}
                        >
                          {sample.label}
                        </Button>
                      ))}
                    </div>
                    <span className="text-xs text-[var(--color-text-muted)]">Enter to send · paste multi-line</span>
                  </div>
                </div>
              );
            })()}

            {/* Idle empty state */}
            {stdinState.phase === "idle" && !executionResult && !isRunning && (
              <p className="py-4 text-sm text-[var(--color-text-muted)]">
                Run <span className="font-code">{filename}</span> to see its output here. Press <kbd className="font-code">Ctrl</kbd>+<kbd className="font-code">Enter</kbd>. Programs that ask for input will prompt you here automatically.
              </p>
            )}

            {/* Standard spinner (not shown when interactive terminal renders its own inline spinner) */}
            {isRunning && stdinState.phase !== "interactive" && stdinState.phase !== "prompt" && (
              <Spinner text="Running in the sandbox…" />
            )}

            {/* Completed result */}
            {executionResult && !isRunning && stdinState.phase !== "interactive" && stdinState.phase !== "prompt" && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] pb-2 text-xs text-[var(--color-text-muted)]">
                  <VerdictBadge status={executionResult.status} />
                  <span className="font-code">exit {executionResult.exitCode ?? "–"} · {executionResult.durationMs} ms</span>
                </div>

                {stdinState.phase === "done" && (
                  <div className="flex flex-wrap items-center justify-end gap-1.5">
                    {onRunNewInput && (
                      <Button type="button" variant="outline" size="xs" onClick={onRunNewInput}>
                        <RotateCcw size={11} aria-hidden="true" /> Run with new input
                      </Button>
                    )}
                    {stdinState.stdinUsed.length > 0 && onSaveStdinToTab && (
                      <Button type="button" variant="ghost" size="xs" onClick={() => onSaveStdinToTab(stdinState.stdinUsed)}>
                        <Save size={11} aria-hidden="true" /> Save to Input
                      </Button>
                    )}
                  </div>
                )}

                {executionResult.compilerOutput && <Output label="Compiler output" text={executionResult.compilerOutput} />}

                {stdinState.phase === "done" && stdinState.kind === "interactive" && !stdinState.prefixBroken ? (
                  <div className="space-y-1">
                    <span className="block text-xs font-medium text-[var(--color-text-muted)]">Terminal</span>
                    <pre className="font-code max-h-80 overflow-auto whitespace-pre-wrap rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5 text-xs text-[var(--color-text-main)]">
                      {stdinState.entries.map((entry, idx) => (
                        <span key={idx}>
                          {entry.prompt}
                          <span className="font-medium text-[var(--color-primary-text)]">{entry.input}</span>
                          {"\n"}
                        </span>
                      ))}
                      {stdinState.trailingOutput}
                    </pre>
                  </div>
                ) : (
                  <>
                    {stdinState.phase === "done" && stdinState.stdinUsed.length > 0 && (
                      <Output label="Input" text={stdinState.stdinUsed} />
                    )}
                    {executionResult.stdout && <Output label="Output" text={executionResult.stdout} />}
                  </>
                )}

                {executionResult.stderr && <Output label="Errors" text={executionResult.stderr} />}
                {!executionResult.stdout && !executionResult.stderr && !executionResult.compilerOutput && stdinState.phase !== "done" && (
                  <p className="text-xs text-[var(--color-text-muted)]">The program printed nothing.</p>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === "stdin" && (
          <div className="flex h-full flex-col gap-2">
            <div className="flex shrink-0 items-center justify-between text-xs text-[var(--color-text-muted)]">
              <label htmlFor="workspace-stdin">Saved standard input for Run</label>
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
            <p className="shrink-0 text-xs text-[var(--color-text-muted)]">
              Leave empty to enter input in Console when you click Run, or paste fixed input here to reuse across runs.
            </p>
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
