"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useProfile } from "@/hooks/use-profile";
import { PixelCard } from "@/components/retro/pixel-card";
import { PixelButton } from "@/components/retro/pixel-button";
import { PixelBadge } from "@/components/retro/pixel-badge";
import { DotIcon, type DotIconName } from "@/components/retro/dot-icon";
import { MonacoEditorPane } from "./monaco-editor-pane";
import { draftRepository } from "@/lib/storage/draft-repository";
import {
  ALL_SUPPORTED_LANGUAGES,
  LANGUAGE_DISPLAY_NAMES,
  getFilenameForLanguage,
  getMonacoLanguage,
  getStarterCode,
} from "@/lib/workspace-defaults";
import type { PreferredLanguage } from "@/types/profile";
import type { VisibleProblem } from "@/types/problem";
import type { ExecutionResult, SandboxHealth } from "@/types/execution";
import type { JudgingResult } from "@/lib/judge/judging-service";

const LANGUAGE_ICONS: Record<PreferredLanguage, DotIconName> = {
  python: "python",
  java: "java",
  cpp: "cplusplus",
  c: "file",
};

type ActiveBottomTab = "console" | "stdin" | "results";

export function WorkspaceView() {
  const { profile } = useProfile();
  const searchParams = useSearchParams();
  const problemIdParam = searchParams.get("problem");

  const [userSelectedLang, setUserSelectedLang] = useState<PreferredLanguage | null>(null);
  const activeLang = userSelectedLang ?? profile?.preferredLanguage ?? "python";

  const [code, setCode] = useState<string>("");
  const [customStdin, setCustomStdin] = useState<string>("");
  const [saveStatus, setSaveStatus] = useState<"SAVED" | "SAVING..." | "MODIFIED">("SAVED");
  const [isResetOpen, setIsResetOpen] = useState<boolean>(false);

  // Problem statement state
  const [problem, setProblem] = useState<VisibleProblem | null>(null);
  const [isProblemDrawerOpen, setIsProblemDrawerOpen] = useState<boolean>(true);

  // Bottom dock state
  const [bottomOpen, setBottomOpen] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<ActiveBottomTab>("console");

  // Execution & Judging state
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [judgingResult, setJudgingResult] = useState<JudgingResult | null>(null);

  // Sandbox health
  const [sandboxHealth, setSandboxHealth] = useState<SandboxHealth | null>(null);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Check sandbox health on mount
  useEffect(() => {
    let isCurrent = true;
    async function checkHealth() {
      try {
        const res = await fetch("/api/health");
        if (res.ok) {
          const data = await res.json();
          if (isCurrent && data.sandbox) {
            setSandboxHealth(data.sandbox);
          }
        }
      } catch {
        if (isCurrent) {
          setSandboxHealth({
            isAvailable: false,
            engine: "Piston (Unreachable)",
            supportedLanguages: [],
          });
        }
      }
    }
    checkHealth();
    return () => {
      isCurrent = false;
    };
  }, []);

  // 2. Fetch problem metadata if ?problem=[id] is present
  useEffect(() => {
    let isCurrent = true;

    async function fetchProblem() {
      if (!problemIdParam) {
        if (isCurrent) setProblem(null);
        return;
      }

      try {
        const res = await fetch(`/api/problems/${encodeURIComponent(problemIdParam)}`);
        if (res.ok) {
          const data = (await res.json()) as VisibleProblem;
          if (isCurrent) {
            setProblem(data);
          }
        } else {
          if (isCurrent) {
            setProblem(null);
          }
        }
      } catch {
        if (isCurrent) {
          setProblem(null);
        }
      }
    }

    fetchProblem();
    return () => {
      isCurrent = false;
    };
  }, [problemIdParam]);

  // 3. Load buffer: draft from IndexedDB, or problem starter code, or general starter code
  useEffect(() => {
    if (!profile) return;
    let isCurrent = true;

    async function loadBuffer() {
      if (!profile) return;
      try {
        const draft = await draftRepository.getDraft(profile.id, activeLang);
        if (isCurrent) {
          if (draft && draft.code.trim().length > 0) {
            setCode(draft.code);
          } else if (problem && problem.starterCodes[activeLang]) {
            setCode(problem.starterCodes[activeLang]);
          } else {
            setCode(getStarterCode(activeLang));
          }
          setSaveStatus("SAVED");
        }
      } catch {
        if (isCurrent) {
          if (problem && problem.starterCodes[activeLang]) {
            setCode(problem.starterCodes[activeLang]);
          } else {
            setCode(getStarterCode(activeLang));
          }
          setSaveStatus("SAVED");
        }
      }
    }

    loadBuffer();
    return () => {
      isCurrent = false;
    };
  }, [profile, activeLang, problem]);

  // 4. Autosave code changes with debounce
  const handleCodeChange = useCallback(
    (newCode: string) => {
      setCode(newCode);
      setSaveStatus("MODIFIED");

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(async () => {
        if (!profile) return;
        setSaveStatus("SAVING...");
        try {
          await draftRepository.saveDraft(profile.id, activeLang, newCode);
          setSaveStatus("SAVED");
        } catch {
          setSaveStatus("MODIFIED");
        }
      }, 600);
    },
    [profile, activeLang]
  );

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // 5. Language switch
  const handleSwitchLanguage = async (newLang: PreferredLanguage) => {
    if (newLang === activeLang) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    if (profile && saveStatus !== "SAVED") {
      try {
        await draftRepository.saveDraft(profile.id, activeLang, code);
      } catch {
        // Continue
      }
    }

    setUserSelectedLang(newLang);
  };

  // 6. Reset buffer
  const handleConfirmReset = async () => {
    if (!profile) return;
    try {
      let resetCode = "";
      if (problem && problem.starterCodes[activeLang]) {
        resetCode = problem.starterCodes[activeLang];
        await draftRepository.saveDraft(profile.id, activeLang, resetCode);
      } else {
        const reset = await draftRepository.resetDraft(profile.id, activeLang);
        resetCode = reset.code;
      }
      setCode(resetCode);
      setSaveStatus("SAVED");
      setIsResetOpen(false);
    } catch {
      setIsResetOpen(false);
    }
  };

  // 7. Download file
  const handleDownloadFile = () => {
    const filename = getFilenameForLanguage(activeLang);
    const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 8. Run Code
  const handleRunCode = async () => {
    setIsRunning(true);
    setBottomOpen(true);
    setActiveTab("console");
    try {
      const res = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: activeLang,
          sourceCode: code,
          stdin: customStdin,
          timeLimitMs: problem?.timeLimitMs ?? 3000,
        }),
      });

      const data = (await res.json()) as ExecutionResult;
      setExecutionResult(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setExecutionResult({
        status: "INTERNAL_ERROR",
        exitCode: null,
        stdout: "",
        stderr: `Failed to invoke execution service: ${msg}`,
        durationMs: 0,
      });
    } finally {
      setIsRunning(false);
    }
  };

  // 9. Submit Solution
  const handleJudgeSubmission = async () => {
    if (!problem) return;
    setIsSubmitting(true);
    setBottomOpen(true);
    setActiveTab("results");

    try {
      const res = await fetch("/api/judge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problemId: problem.id,
          language: activeLang,
          sourceCode: code,
        }),
      });

      const data = (await res.json()) as JudgingResult;
      setJudgingResult(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setJudgingResult({
        problemId: problem.id,
        language: activeLang,
        overallVerdict: "INTERNAL_JUDGE_ERROR",
        passedTests: 0,
        totalTests: problem.visibleTestCases.length,
        scorePercentage: 0,
        maxDurationMs: 0,
        testResults: [],
        error: `Submission failed: ${msg}`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filename = getFilenameForLanguage(activeLang);
  const monacoLang = getMonacoLanguage(activeLang);

  return (
    <div className="space-y-4 flex flex-col h-[calc(100vh-140px)] min-h-[640px]">
      {/* Sandbox Offline Warning Banner */}
      {sandboxHealth && !sandboxHealth.isAvailable && (
        <div className="px-4 py-2.5 bg-[var(--color-elevated)] border-2 border-[var(--color-pink)] text-xs font-mono text-[var(--color-text-main)] flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 text-[var(--color-pink)]">
            <span className="font-bold font-heading text-sm">!</span>
            <span>
              SANDBOX ENGINE OFFLINE: Local Piston container on port 2000 is not reachable.
            </span>
          </div>
          <span className="text-[0.6875rem] text-[var(--color-text-muted)] bg-[var(--color-canvas)] px-2 py-1 border border-[var(--color-border)]">
            docker run -d -p 2000:2000 ghcr.io/engineerman/piston/piston
          </span>
        </div>
      )}

      {/* Problem Context Banner (When solving a problem) */}
      {problem && (
        <PixelCard
          variant="elevated"
          className="appearance-panel p-3.5 border-2 border-[var(--color-border)] bg-[var(--color-surface)] shrink-0 space-y-2"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-mono text-xs text-[var(--color-accent)] uppercase tracking-wider">
                [PROBLEM]
              </span>
              <h2 className="font-heading text-lg text-[var(--color-text-main)]">{problem.title}_</h2>
              <PixelBadge
                variant={
                  problem.difficulty === "beginner"
                    ? "mint"
                    : problem.difficulty === "intermediate"
                    ? "cyan"
                    : "pink"
                }
                bracketed
              >
                {problem.difficulty.toUpperCase()}
              </PixelBadge>
              <span className="text-xs font-mono text-[var(--color-text-muted)]">
                Limit: {problem.timeLimitMs}ms
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsProblemDrawerOpen(!isProblemDrawerOpen)}
                className="text-xs font-mono text-[var(--color-accent)] hover:underline cursor-pointer flex items-center gap-1"
              >
                <span>{isProblemDrawerOpen ? "HIDE STATEMENT" : "VIEW STATEMENT"}</span>
                <span>{isProblemDrawerOpen ? "▲" : "▼"}</span>
              </button>
              <Link href="/app/challenges">
                <PixelButton variant="ghost" size="sm" className="text-xs">
                  CHANGE PROBLEM &rarr;
                </PixelButton>
              </Link>
            </div>
          </div>

          {/* Collapsible Problem Statement Details */}
          {isProblemDrawerOpen && (
            <div className="pt-2 border-t border-[var(--color-border)] text-xs text-[var(--color-text-muted)] space-y-2 max-h-48 overflow-y-auto pr-2">
              <p className="leading-relaxed">{problem.description}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 font-mono text-[0.6875rem]">
                <div className="p-2 bg-[var(--color-canvas)] border border-[var(--color-border)]">
                  <strong className="text-[var(--color-text-main)] block mb-0.5">Input Specification:</strong>
                  <span>{problem.inputSpec}</span>
                </div>
                <div className="p-2 bg-[var(--color-canvas)] border border-[var(--color-border)]">
                  <strong className="text-[var(--color-text-main)] block mb-0.5">Output Specification:</strong>
                  <span>{problem.outputSpec}</span>
                </div>
              </div>
              {problem.sampleTestCases.length > 0 && (
                <div className="pt-1">
                  <span className="text-[var(--color-text-main)] font-mono text-[0.6875rem] block mb-1">
                    Sample Test Cases:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {problem.sampleTestCases.map((sample, idx) => (
                      <div
                        key={idx}
                        className="p-2 bg-[var(--color-canvas)] border border-[var(--color-border)] font-mono text-[0.625rem] space-y-1"
                      >
                        <div>
                          <span className="text-[var(--color-text-dim)]">Input: </span>
                          <span className="text-[var(--color-text-main)]">{sample.input || "(empty)"}</span>
                        </div>
                        <div>
                          <span className="text-[var(--color-text-dim)]">Expected: </span>
                          <span className="text-[var(--color-mint)]">{sample.output.trim()}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setCustomStdin(sample.input);
                            setActiveTab("stdin");
                            setBottomOpen(true);
                          }}
                          className="text-[var(--color-accent)] hover:underline cursor-pointer block mt-1"
                        >
                          Use in Custom Stdin &rarr;
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </PixelCard>
      )}

      {/* Top Workspace Toolbar */}
      <PixelCard
        variant="default"
        className="appearance-panel p-3 border-2 border-[var(--color-border)] bg-[var(--color-surface)] flex flex-wrap items-center justify-between gap-3 shrink-0"
      >
        {/* Left: Active File Tab & Language Selector */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--color-canvas)] border-2 border-[var(--color-accent)] text-[var(--color-text-main)] [box-shadow:var(--shadow-btn)]">
            <DotIcon name={LANGUAGE_ICONS[activeLang]} size={16} color="var(--color-accent)" />
            <span className="font-heading text-sm">{filename}</span>
            <span
              className={`w-2 h-2 rounded-full ml-1 ${
                saveStatus === "SAVED"
                  ? "bg-[var(--color-mint)]"
                  : saveStatus === "SAVING..."
                  ? "bg-[var(--color-accent)] animate-pulse"
                  : "bg-[var(--color-pink)]"
              }`}
              title={`Buffer Status: ${saveStatus}`}
            />
          </div>

          {/* Language Switcher Buttons */}
          <div className="flex items-center gap-1 bg-[var(--color-canvas)] p-1 border border-[var(--color-border)]">
            {ALL_SUPPORTED_LANGUAGES.map((lang) => {
              const isCurrent = activeLang === lang;
              return (
                <button
                  key={lang}
                  type="button"
                  onClick={() => handleSwitchLanguage(lang)}
                  className={`px-2.5 py-1 text-xs font-mono transition-colors cursor-pointer ${
                    isCurrent
                      ? "bg-[var(--color-elevated)] text-[var(--color-accent)] font-bold border border-[var(--color-accent)]"
                      : "text-[var(--color-text-dim)] hover:text-[var(--color-text-muted)] border border-transparent"
                  }`}
                >
                  {LANGUAGE_DISPLAY_NAMES[lang]}
                </button>
              );
            })}
          </div>

          <span className="font-mono text-[0.6875rem] text-[var(--color-text-dim)] hidden sm:inline">
            [{saveStatus}]
          </span>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <PixelButton
            variant="ghost"
            size="sm"
            onClick={() => setIsResetOpen(true)}
            className="text-xs"
          >
            RESET BUFFER ↺
          </PixelButton>

          <PixelButton
            variant="ghost"
            size="sm"
            onClick={handleDownloadFile}
            className="text-xs"
          >
            DOWNLOAD ↓
          </PixelButton>

          {/* RUN CODE Button */}
          <PixelButton
            variant="cyan"
            size="sm"
            onClick={handleRunCode}
            disabled={isRunning}
            className="text-xs font-heading"
          >
            {isRunning ? "RUNNING..." : "RUN CODE ▶"}
          </PixelButton>

          {/* SUBMIT SOLUTION Button */}
          {problem && (
            <PixelButton
              variant="primary"
              size="sm"
              onClick={handleJudgeSubmission}
              disabled={isSubmitting}
              className="text-xs font-heading"
            >
              {isSubmitting ? "JUDGING..." : "SUBMIT SOLUTION ✔"}
            </PixelButton>
          )}
        </div>
      </PixelCard>

      {/* Editor & Multi-Tab Docked Pane */}
      <div className="flex-1 flex flex-col min-h-0 border-2 border-[var(--color-border)] bg-[var(--color-canvas)] [border-radius:var(--radius-card)] overflow-hidden relative">
        {/* Monaco Editor Pane */}
        <div className="flex-1 min-h-0 relative">
          <MonacoEditorPane
            language={monacoLang}
            value={code}
            onChange={handleCodeChange}
          />
        </div>

        {/* Docked Execution & Output Split Pane */}
        <div className="border-t-2 border-[var(--color-border)] bg-[var(--color-surface)] shrink-0">
          {/* Dock Header Tabs */}
          <div className="px-3 py-1.5 bg-[var(--color-elevated)] border-b border-[var(--color-border)] flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setBottomOpen(!bottomOpen)}
                className="text-[var(--color-accent)] hover:text-[var(--color-text-main)] font-bold cursor-pointer pr-1"
              >
                {bottomOpen ? "▼" : "▲"}
              </button>

              {/* Tab 1: Console */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab("console");
                  setBottomOpen(true);
                }}
                className={`px-2.5 py-1 text-xs font-heading cursor-pointer border ${
                  activeTab === "console"
                    ? "bg-[var(--color-canvas)] border-[var(--color-accent)] text-[var(--color-accent)]"
                    : "border-transparent text-[var(--color-text-dim)] hover:text-[var(--color-text-main)]"
                }`}
              >
                EXECUTION OUTPUT
              </button>

              {/* Tab 2: Custom Stdin */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab("stdin");
                  setBottomOpen(true);
                }}
                className={`px-2.5 py-1 text-xs font-heading cursor-pointer border ${
                  activeTab === "stdin"
                    ? "bg-[var(--color-canvas)] border-[var(--color-accent)] text-[var(--color-accent)]"
                    : "border-transparent text-[var(--color-text-dim)] hover:text-[var(--color-text-main)]"
                }`}
              >
                CUSTOM STDIN {customStdin.length > 0 && `(${customStdin.length}B)`}
              </button>

              {/* Tab 3: Test Results */}
              {problem && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("results");
                    setBottomOpen(true);
                  }}
                  className={`px-2.5 py-1 text-xs font-heading cursor-pointer border ${
                    activeTab === "results"
                      ? "bg-[var(--color-canvas)] border-[var(--color-mint)] text-[var(--color-mint)]"
                      : "border-transparent text-[var(--color-text-dim)] hover:text-[var(--color-text-main)]"
                  }`}
                >
                  TEST RESULTS {judgingResult && `[${judgingResult.overallVerdict}]`}
                </button>
              )}
            </div>

            <div className="flex items-center gap-3 text-[0.6875rem] text-[var(--color-text-dim)]">
              <span>{code.length} bytes</span>
            </div>
          </div>

          {/* Dock Body Content */}
          {bottomOpen && (
            <div className="p-3 font-mono text-xs bg-[var(--color-canvas)] h-44 overflow-y-auto select-text">
              {/* TAB 1: Console Execution Output */}
              {activeTab === "console" && (
                <div className="space-y-2">
                  {!executionResult && !isRunning && (
                    <div className="text-[var(--color-text-dim)] space-y-1">
                      <p>&gt; Ready. Click &quot;RUN CODE ▶&quot; to execute your program against standard input.</p>
                      <p className="text-[0.6875rem]">
                        &gt; Target: {filename} &bull; Compiler: {LANGUAGE_DISPLAY_NAMES[activeLang]}
                      </p>
                    </div>
                  )}

                  {isRunning && (
                    <div className="text-[var(--color-accent)] animate-pulse">
                      &gt; Dispatching code to sandbox execution runner...
                    </div>
                  )}

                  {executionResult && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 flex-wrap border-b border-[var(--color-border)] pb-1.5 text-[0.6875rem]">
                        <span
                          className={`font-heading text-xs px-1.5 py-0.5 border ${
                            executionResult.status === "SUCCESS"
                              ? "border-[var(--color-mint)] text-[var(--color-mint)] bg-[var(--color-mint)]/10"
                              : "border-[var(--color-pink)] text-[var(--color-pink)] bg-[var(--color-pink)]/10"
                          }`}
                        >
                          STATUS: {executionResult.status}
                        </span>
                        <span className="text-[var(--color-text-muted)]">
                          Exit code: {executionResult.exitCode ?? "N/A"}
                        </span>
                        <span className="text-[var(--color-text-muted)]">
                          Time: {executionResult.durationMs}ms
                        </span>
                      </div>

                      {executionResult.compilerOutput && (
                        <div className="space-y-1">
                          <span className="text-[var(--color-pink)] font-bold">[COMPILER OUTPUT]</span>
                          <pre className="text-[var(--color-pink)] whitespace-pre-wrap bg-[var(--color-surface)] p-2 border border-[var(--color-pink)]/40">
                            {executionResult.compilerOutput}
                          </pre>
                        </div>
                      )}

                      {executionResult.stdout && (
                        <div className="space-y-1">
                          <span className="text-[var(--color-mint)] font-bold">[STANDARD OUTPUT]</span>
                          <pre className="text-[var(--color-text-main)] whitespace-pre-wrap bg-[var(--color-canvas)] p-2 border border-[var(--color-border)]">
                            {executionResult.stdout}
                          </pre>
                        </div>
                      )}

                      {executionResult.stderr && (
                        <div className="space-y-1">
                          <span className="text-[var(--color-pink)] font-bold">[STANDARD ERROR]</span>
                          <pre className="text-[var(--color-pink)] whitespace-pre-wrap bg-[var(--color-surface)] p-2 border border-[var(--color-border)]">
                            {executionResult.stderr}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: Custom Stdin */}
              {activeTab === "stdin" && (
                <div className="space-y-1.5 h-full flex flex-col">
                  <div className="flex items-center justify-between text-[0.6875rem] text-[var(--color-text-dim)]">
                    <span>Standard Input fed into RUN CODE:</span>
                    <button
                      type="button"
                      onClick={() => setCustomStdin("")}
                      className="hover:text-[var(--color-text-main)] underline cursor-pointer"
                    >
                      Clear Stdin
                    </button>
                  </div>
                  <textarea
                    value={customStdin}
                    onChange={(e) => setCustomStdin(e.target.value)}
                    placeholder="Type sample input here (e.g. 10 20)..."
                    className="flex-1 w-full bg-[var(--color-canvas)] border border-[var(--color-border)] p-2 text-[var(--color-text-main)] font-mono text-xs resize-none focus:outline-none focus:border-[var(--color-accent)]"
                  />
                </div>
              )}

              {/* TAB 3: Test Results */}
              {activeTab === "results" && (
                <div className="space-y-3">
                  {!judgingResult && !isSubmitting && (
                    <div className="text-[var(--color-text-dim)]">
                      &gt; Click &quot;SUBMIT SOLUTION ✔&quot; to evaluate your code against the problem test suite.
                    </div>
                  )}

                  {isSubmitting && (
                    <div className="text-[var(--color-mint)] animate-pulse">
                      &gt; Evaluating test cases against sandbox judge...
                    </div>
                  )}

                  {judgingResult && (
                    <div className="space-y-3">
                      {/* Overall Verdict Banner */}
                      <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2 flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-heading text-base px-2 py-0.5 border ${
                              judgingResult.overallVerdict === "ACCEPTED"
                                ? "border-[var(--color-mint)] text-[var(--color-mint)] bg-[var(--color-mint)]/15"
                                : "border-[var(--color-pink)] text-[var(--color-pink)] bg-[var(--color-pink)]/15"
                            }`}
                          >
                            VERDICT: {judgingResult.overallVerdict}
                          </span>
                          <span className="text-[var(--color-text-muted)] text-xs">
                            Score: {judgingResult.passedTests} / {judgingResult.totalTests} ({judgingResult.scorePercentage}%)
                          </span>
                        </div>
                        <span className="text-[0.6875rem] text-[var(--color-text-dim)]">
                          Max Time: {judgingResult.maxDurationMs}ms
                        </span>
                      </div>

                      {judgingResult.compilerOutput && (
                        <div className="space-y-1">
                          <span className="text-[var(--color-pink)] font-bold">[COMPILATION ERROR]</span>
                          <pre className="text-[var(--color-pink)] whitespace-pre-wrap bg-[var(--color-surface)] p-2 border border-[var(--color-pink)]/40 text-xs">
                            {judgingResult.compilerOutput}
                          </pre>
                        </div>
                      )}

                      {/* Test Cases Breakdown */}
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
                                <span className={tc.passed ? "text-[var(--color-mint)]" : "text-[var(--color-pink)]"}>
                                  {tc.passed ? "✔" : "✖"}
                                </span>
                                <span className="text-[var(--color-text-main)] font-bold">
                                  Test Case #{idx + 1}
                                </span>
                                {tc.isHidden && (
                                  <span className="text-[0.625rem] px-1 bg-[var(--color-elevated)] text-[var(--color-text-muted)] border border-[var(--color-border)]">
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
                                  <span className="text-[var(--color-text-dim)] block">Actual Output:</span>
                                  <code className={tc.passed ? "text-[var(--color-text-main)]" : "text-[var(--color-pink)]"}>
                                    {tc.actualOutput?.trim() || "(no output)"}
                                  </code>
                                </div>
                              </div>
                            )}

                            {tc.isHidden && (
                              <p className="text-[0.625rem] text-[var(--color-text-dim)] pt-0.5">
                                Inputs and expected results for hidden evaluation cases are redacted to prevent test vector extraction.
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
          )}
        </div>
      </div>

      {/* Reset Buffer Confirmation Modal */}
      {isResetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <PixelCard
            variant="elevated"
            className="w-full max-w-md border-2 border-[var(--color-pink)] p-6 bg-[var(--color-surface)] [box-shadow:var(--shadow-btn)] space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 border-2 border-[var(--color-pink)] bg-[var(--color-canvas)] flex items-center justify-center text-[var(--color-pink)] font-heading text-xl font-bold">
                !
              </div>
              <div>
                <h3 className="font-heading text-lg text-[var(--color-text-main)]">
                  RESET WORKSPACE BUFFER?_
                </h3>
                <span className="font-mono text-xs text-[var(--color-text-muted)]">
                  Target: {filename}
                </span>
              </div>
            </div>

            <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
              This will reset your current buffer for <strong>{filename}</strong> back to the starter
              code. Any unsaved modifications in this buffer will be permanently lost.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <PixelButton
                variant="ghost"
                size="sm"
                onClick={() => setIsResetOpen(false)}
              >
                CANCEL
              </PixelButton>
              <PixelButton
                variant="pink"
                size="sm"
                onClick={handleConfirmReset}
              >
                CONFIRM RESET ↺
              </PixelButton>
            </div>
          </PixelCard>
        </div>
      )}
    </div>
  );
}
