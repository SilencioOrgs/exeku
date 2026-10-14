"use client";

import React from "react";
import { PixelBadge } from "@/components/retro/pixel-badge";

import { DotIcon } from "@/components/retro/dot-icon";
import type { ExecutionResult } from "@/types/execution";
import type { JudgingResult } from "@/lib/judge/judging-service";
import type { PreferredLanguage } from "@/types/profile";
import { LANGUAGE_DISPLAY_NAMES } from "@/lib/workspace-defaults";

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
  activeLanguage: PreferredLanguage;
  filename: string;
  isDemoMode?: boolean;
  demoNote?: string | null;
  className?: string;
}

export function ResultsPane({
  activeTab,
  onTabChange,
  isRunning,
  isSubmitting,
  executionResult,
  judgingResult,
  customStdin,
  onCustomStdinChange,
  activeLanguage,
  filename,
  isDemoMode = false,
  demoNote = null,
  className = "",
}: ResultsPaneProps) {
  return (
    <div
      className={`results-pane flex flex-col h-full bg-[var(--color-surface)] border-2 border-[var(--color-border)] select-text overflow-hidden ${className}`}
    >
      {/* Tab Header Strip */}
      <div className="workspace-output-header p-1 bg-[var(--color-elevated)] border-b-2 border-[var(--color-border)] flex items-center justify-between gap-1 shrink-0 overflow-x-auto">
        <div className="flex items-center gap-1">
          {/* Tab 1: Console Execution Output */}
          <button
            type="button"
            onClick={() => onTabChange("console")}
            className={`flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-heading cursor-pointer border transition-colors ${
              activeTab === "console"
                ? "bg-[var(--color-canvas)] border-[var(--color-accent)] text-[var(--color-accent)] [box-shadow:var(--shadow-btn)]"
                : "border-transparent text-[var(--color-text-dim)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-canvas)]/50"
            }`}
          >
            <DotIcon name="powershell" adaptive size={13} aria-hidden="true" />
            <span>CONSOLE</span>
          </button>

          {/* Tab 2: Custom Stdin */}
          <button
            type="button"
            onClick={() => onTabChange("stdin")}
            className={`flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-heading cursor-pointer border transition-colors ${
              activeTab === "stdin"
                ? "bg-[var(--color-canvas)] border-[var(--color-accent)] text-[var(--color-accent)] [box-shadow:var(--shadow-btn)]"
                : "border-transparent text-[var(--color-text-dim)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-canvas)]/50"
            }`}
          >
            <DotIcon name="database" size={13} aria-hidden="true" />
            <span>STDIN</span>
            {customStdin.length > 0 && (
              <span className="text-[0.625rem] opacity-75 font-mono">
                ({customStdin.length}B)
              </span>
            )}
          </button>

          {/* Tab 3: Test Results */}
          <button
            type="button"
            onClick={() => onTabChange("results")}
            className={`flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-heading cursor-pointer border transition-colors ${
              activeTab === "results"
                ? "bg-[var(--color-canvas)] border-[var(--color-mint)] text-[var(--color-mint)] [box-shadow:var(--shadow-btn)]"
                : "border-transparent text-[var(--color-text-dim)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-canvas)]/50"
            }`}
          >
            <DotIcon name="circleCheck" size={13} aria-hidden="true" />
            <span>RESULTS</span>
            {judgingResult && (
              <span
                className={`text-[0.625rem] font-mono font-bold px-1 py-0.5 border ${
                  judgingResult.overallVerdict === "ACCEPTED"
                    ? "border-[var(--color-mint)] text-[var(--color-mint)]"
                    : "border-[var(--color-pink)] text-[var(--color-pink)]"
                }`}
              >
                {judgingResult.overallVerdict === "ACCEPTED" ? "AC" : "WA"}
              </span>
            )}
          </button>
        </div>

        {/* Demo Mode Notice Badge */}
        {isDemoMode && (
          <PixelBadge variant="purple" bracketed className="text-[0.625rem] py-0 px-1 font-mono shrink-0">
            DEMO
          </PixelBadge>
        )}
      </div>

      {/* Demo Warning Banner if Custom Code is Not Evaluated */}
      {isDemoMode && demoNote && (
        <div className="px-3 py-1.5 bg-[var(--color-elevated)] border-b border-[var(--color-accent)] text-[0.6875rem] font-mono text-[var(--color-accent)] flex items-center gap-1.5 shrink-0">
          <DotIcon name="circleBlock" size={12} />
          <span>{demoNote}</span>
        </div>
      )}

      {/* Body Area */}
      <div className="flex-1 overflow-y-auto p-3 font-mono text-xs bg-[var(--color-canvas)] select-text min-h-0">
        {/* TAB 1: CONSOLE OUTPUT */}
        {activeTab === "console" && (
          <div className="space-y-3">
            {!executionResult && !isRunning && (
              <div className="text-[var(--color-text-dim)] space-y-2 py-4">
                <p>&gt; Execution console ready.</p>
                <p className="text-[0.6875rem] text-[var(--color-text-muted)]">
                  Click &quot;RUN CODE <DotIcon name="circlePlay" size={14} aria-hidden="true" />&quot; to execute {filename} with standard input.
                </p>
                <div className="p-2.5 bg-[var(--color-surface)] border border-[var(--color-border)] text-[0.625rem] space-y-1 mt-2">
                  <div className="text-[var(--color-accent)] font-bold">[ENVIRONMENT TELEMETRY]</div>
                  <div>Compiler / Runner: {LANGUAGE_DISPLAY_NAMES[activeLanguage]}</div>
                  <div>Stdin Buffer: {customStdin ? `${customStdin.length} bytes loaded` : "Empty (0 bytes)"}</div>
                </div>
              </div>
            )}

            {isRunning && (
              <div className="flex items-center gap-2 text-[var(--color-accent)] animate-pulse py-4">
                <span className="w-2 h-2 rounded-full bg-[var(--color-accent)] animate-ping" />
                <span>&gt; Dispatching execution request to sandbox runner...</span>
              </div>
            )}

            {executionResult && (
              <div className="space-y-2.5">
                {/* Result Status Strip */}
                <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2 flex-wrap gap-2 text-[0.6875rem]">
                  <span
                    className={`font-heading text-xs px-2 py-0.5 border ${
                      executionResult.status === "SUCCESS"
                        ? "border-[var(--color-mint)] text-[var(--color-mint)] bg-[var(--color-mint)]/10"
                        : "border-[var(--color-pink)] text-[var(--color-pink)] bg-[var(--color-pink)]/10"
                    }`}
                  >
                    STATUS: {executionResult.status}
                  </span>

                  <div className="flex items-center gap-3 text-[var(--color-text-muted)]">
                    <span>Exit: {executionResult.exitCode ?? "N/A"}</span>
                    <span>Time: {executionResult.durationMs}ms</span>
                  </div>
                </div>

                {/* Compiler Output */}
                {executionResult.compilerOutput && (
                  <div className="space-y-1">
                    <span className="text-[var(--color-pink)] font-bold text-[0.6875rem] block">
                      [COMPILER OUTPUT]
                    </span>
                    <pre className="text-[var(--color-pink)] whitespace-pre-wrap bg-[var(--color-surface)] p-2.5 border border-[var(--color-pink)]/40 text-xs">
                      {executionResult.compilerOutput}
                    </pre>
                  </div>
                )}

                {/* Standard Output */}
                {executionResult.stdout && (
                  <div className="space-y-1">
                    <span className="text-[var(--color-mint)] font-bold text-[0.6875rem] block">
                      [STANDARD OUTPUT]
                    </span>
                    <pre className="text-[var(--color-text-main)] whitespace-pre-wrap bg-[var(--color-surface)] p-2.5 border border-[var(--color-border)] text-xs">
                      {executionResult.stdout}
                    </pre>
                  </div>
                )}

                {/* Standard Error */}
                {executionResult.stderr && (
                  <div className="space-y-1">
                    <span className="text-[var(--color-pink)] font-bold text-[0.6875rem] block">
                      [STANDARD ERROR]
                    </span>
                    <pre className="text-[var(--color-pink)] whitespace-pre-wrap bg-[var(--color-surface)] p-2.5 border border-[var(--color-border)] text-xs">
                      {executionResult.stderr}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: CUSTOM STDIN */}
        {activeTab === "stdin" && (
          <div className="space-y-2 h-full flex flex-col">
            <div className="flex items-center justify-between text-[0.6875rem] text-[var(--color-text-dim)] shrink-0">
              <span>Standard Input passed into program during execution:</span>
              <button
                type="button"
                onClick={() => onCustomStdinChange("")}
                className="hover:text-[var(--color-text-main)] underline cursor-pointer"
              >
                Clear
              </button>
            </div>
            <textarea
              value={customStdin}
              onChange={(e) => onCustomStdinChange(e.target.value)}
              placeholder="Enter standard input here (e.g. 10 20)..."
              className="flex-1 w-full bg-[var(--color-surface)] border border-[var(--color-border)] p-2.5 text-[var(--color-text-main)] font-mono text-xs resize-none focus:outline-none focus:border-[var(--color-accent)]"
            />
            <div className="text-[0.625rem] text-[var(--color-text-dim)] shrink-0">
              Tip: You can click &quot;USE IN STDIN&quot; on any sample test case in the Problem panel to load it here.
            </div>
          </div>
        )}

        {/* TAB 3: TEST RESULTS */}
        {activeTab === "results" && (
          <div className="space-y-3">
            {!judgingResult && !isSubmitting && (
              <div className="text-[var(--color-text-dim)] space-y-2 py-4">
                <p>&gt; Test evaluator ready.</p>
                <p className="text-[0.6875rem] text-[var(--color-text-muted)]">
                  Click &quot;SUBMIT SOLUTION <DotIcon name="circleCheck" size={14} aria-hidden="true" />&quot; to test your code against the full evaluation suite.
                </p>
              </div>
            )}

            {isSubmitting && (
              <div className="flex items-center gap-2 text-[var(--color-mint)] animate-pulse py-4">
                <span className="w-2 h-2 rounded-full bg-[var(--color-mint)] animate-ping" />
                <span>&gt; Evaluating test cases in sandbox judge...</span>
              </div>
            )}

            {judgingResult && (
              <div className="space-y-3">
                {/* Overall Verdict Banner */}
                <div className="p-3 bg-[var(--color-surface)] border-2 border-[var(--color-border)] space-y-1.5">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span
                      className={`font-heading text-sm px-2 py-0.5 border ${
                        judgingResult.overallVerdict === "ACCEPTED"
                          ? "border-[var(--color-mint)] text-[var(--color-mint)] bg-[var(--color-mint)]/15"
                          : "border-[var(--color-pink)] text-[var(--color-pink)] bg-[var(--color-pink)]/15"
                      }`}
                    >
                      VERDICT: {judgingResult.overallVerdict}
                    </span>

                    <span className="text-xs text-[var(--color-text-muted)]">
                      Score: {judgingResult.passedTests} / {judgingResult.totalTests} ({judgingResult.scorePercentage}%)
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[0.6875rem] text-[var(--color-text-dim)] pt-1 border-t border-[var(--color-border)]/50">
                    <div className="flex items-center gap-1">
                      <DotIcon name="alarm" size={11} />
                      <span>Max Runtime: {judgingResult.maxDurationMs}ms</span>
                    </div>
                    {isDemoMode && (
                      <span className="text-[var(--color-accent)] font-bold">
                        [DEMO SIMULATION]
                      </span>
                    )}
                  </div>
                </div>

                {/* Compiler Output */}
                {judgingResult.compilerOutput && (
                  <div className="space-y-1">
                    <span className="text-[var(--color-pink)] font-bold text-[0.6875rem] block">
                      [COMPILATION ERROR]
                    </span>
                    <pre className="text-[var(--color-pink)] whitespace-pre-wrap bg-[var(--color-surface)] p-2.5 border border-[var(--color-pink)]/40 text-xs">
                      {judgingResult.compilerOutput}
                    </pre>
                  </div>
                )}

                {/* Per-Test Case Breakdown */}
                <div className="space-y-2">
                  {judgingResult.testResults.map((tc, idx) => (
                    <div
                      key={tc.testCaseId || idx}
                      className={`p-2.5 border text-xs space-y-1 ${
                        tc.passed
                          ? "border-[var(--color-mint)]/40 bg-[var(--color-mint)]/5"
                          : "border-[var(--color-pink)]/40 bg-[var(--color-pink)]/5"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {tc.passed ? (
                            <DotIcon name="circleCheck" size={13} aria-hidden="true" className="text-[var(--color-mint)]" />
                          ) : (
                            <DotIcon name="circleClose" size={13} className="text-[var(--color-pink)]" />
                          )}
                          <span className="text-[var(--color-text-main)] font-bold">
                            Test Case #{idx + 1}
                          </span>
                          {tc.isHidden && (
                            <span className="text-[0.5625rem] px-1 bg-[var(--color-elevated)] text-[var(--color-text-muted)] border border-[var(--color-border)]">
                              HIDDEN
                            </span>
                          )}
                        </div>

                        <span
                          className={`text-[0.6875rem] font-bold ${
                            tc.passed ? "text-[var(--color-mint)]" : "text-[var(--color-pink)]"
                          }`}
                        >
                          {tc.verdict} ({tc.durationMs}ms)
                        </span>
                      </div>

                      {!tc.isHidden && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-1 text-[0.6875rem] font-mono text-[var(--color-text-muted)]">
                          <div>
                            <span className="text-[var(--color-text-dim)] block">Input:</span>
                            <code className="text-[var(--color-text-main)]">{tc.input || "(empty)"}</code>
                          </div>
                          <div>
                            <span className="text-[var(--color-text-dim)] block">Expected:</span>
                            <code className="text-[var(--color-mint)]">{tc.expectedOutput?.trim()}</code>
                          </div>
                          <div>
                            <span className="text-[var(--color-text-dim)] block">Actual:</span>
                            <code className={tc.passed ? "text-[var(--color-text-main)]" : "text-[var(--color-pink)]"}>
                              {tc.actualOutput?.trim() || "(no output)"}
                            </code>
                          </div>
                        </div>
                      )}

                      {tc.isHidden && (
                        <p className="text-[0.625rem] text-[var(--color-text-dim)] pt-0.5">
                          Inputs and expected outputs for hidden test cases are securely redacted.
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
