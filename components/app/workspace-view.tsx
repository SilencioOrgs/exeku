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
        <div className="px-4 py-2.5 bg-[#1B0F36] border-2 border-[#FF007A] text-xs font-mono text-[#D4C3DC] flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 text-[#FF007A]">
            <span className="font-bold font-pixel text-sm">!</span>
            <span>
              SANDBOX ENGINE OFFLINE: Local Piston container on port 2000 is not reachable.
            </span>
          </div>
          <span className="text-[11px] text-[#A79EC4] bg-[#090514] px-2 py-1 border border-[#2E1A57]">
            docker run -d -p 2000:2000 ghcr.io/engineerman/piston/piston
          </span>
        </div>
      )}

      {/* Problem Context Banner (When solving a problem) */}
      {problem && (
        <PixelCard
          variant="elevated"
          className="p-3.5 border-2 border-[#3D2275] bg-[#120A24] shrink-0 space-y-2"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-mono text-xs text-[#00F0FF] uppercase tracking-wider">
                [PROBLEM]
              </span>
              <h2 className="font-pixel text-lg text-white">{problem.title}_</h2>
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
              <span className="text-xs font-mono text-[#A79EC4]">
                Limit: {problem.timeLimitMs}ms
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsProblemDrawerOpen(!isProblemDrawerOpen)}
                className="text-xs font-mono text-[#00F0FF] hover:underline cursor-pointer flex items-center gap-1"
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
            <div className="pt-2 border-t border-[#2E1A57] text-xs text-[#A79EC4] space-y-2 max-h-48 overflow-y-auto pr-2">
              <p className="leading-relaxed">{problem.description}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 font-mono text-[11px]">
                <div className="p-2 bg-[#090514] border border-[#2E1A57]">
                  <strong className="text-white block mb-0.5">Input Specification:</strong>
                  <span>{problem.inputSpec}</span>
                </div>
                <div className="p-2 bg-[#090514] border border-[#2E1A57]">
                  <strong className="text-white block mb-0.5">Output Specification:</strong>
                  <span>{problem.outputSpec}</span>
                </div>
              </div>
              {problem.sampleTestCases.length > 0 && (
                <div className="pt-1">
                  <span className="text-white font-mono text-[11px] block mb-1">
                    Sample Test Cases:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {problem.sampleTestCases.map((sample, idx) => (
                      <div
                        key={idx}
                        className="p-2 bg-[#090514] border border-[#2E1A57] font-mono text-[10px] space-y-1"
                      >
                        <div>
                          <span className="text-[#7A6E9B]">Input: </span>
                          <span className="text-white">{sample.input || "(empty)"}</span>
                        </div>
                        <div>
                          <span className="text-[#7A6E9B]">Expected: </span>
                          <span className="text-[#00FF9D]">{sample.output.trim()}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setCustomStdin(sample.input);
                            setActiveTab("stdin");
                            setBottomOpen(true);
                          }}
                          className="text-[#00F0FF] hover:underline cursor-pointer block mt-1"
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
        className="p-3 border-2 border-[#2E1A57] bg-[#120A24] flex flex-wrap items-center justify-between gap-3 shrink-0"
      >
        {/* Left: Active File Tab & Language Selector */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#090514] border-2 border-[#00F0FF] text-white shadow-[2px_2px_0px_#000000]">
            <DotIcon name={LANGUAGE_ICONS[activeLang]} size={16} color="#00F0FF" />
            <span className="font-pixel text-sm">{filename}</span>
            <span
              className={`w-2 h-2 rounded-full ml-1 ${
                saveStatus === "SAVED"
                  ? "bg-[#00FF9D]"
                  : saveStatus === "SAVING..."
                  ? "bg-[#00F0FF] animate-pulse"
                  : "bg-[#FF007A]"
              }`}
              title={`Buffer Status: ${saveStatus}`}
            />
          </div>

          {/* Language Switcher Buttons */}
          <div className="flex items-center gap-1 bg-[#090514] p-1 border border-[#2E1A57]">
            {ALL_SUPPORTED_LANGUAGES.map((lang) => {
              const isCurrent = activeLang === lang;
              return (
                <button
                  key={lang}
                  type="button"
                  onClick={() => handleSwitchLanguage(lang)}
                  className={`px-2.5 py-1 text-xs font-mono transition-colors cursor-pointer ${
                    isCurrent
                      ? "bg-[#1B0F36] text-[#00F0FF] font-bold border border-[#00F0FF]"
                      : "text-[#7A6E9B] hover:text-[#A79EC4] border border-transparent"
                  }`}
                >
                  {LANGUAGE_DISPLAY_NAMES[lang]}
                </button>
              );
            })}
          </div>

          <span className="font-mono text-[11px] text-[#7A6E9B] hidden sm:inline">
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
            className="text-xs font-pixel"
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
              className="text-xs font-pixel"
            >
              {isSubmitting ? "JUDGING..." : "SUBMIT SOLUTION ✔"}
            </PixelButton>
          )}
        </div>
      </PixelCard>

      {/* Editor & Multi-Tab Docked Pane */}
      <div className="flex-1 flex flex-col min-h-0 border-2 border-[#2E1A57] bg-[#090514] relative">
        {/* Monaco Editor Pane */}
        <div className="flex-1 min-h-0 relative">
          <MonacoEditorPane
            language={monacoLang}
            value={code}
            onChange={handleCodeChange}
          />
        </div>

        {/* Docked Execution & Output Split Pane */}
        <div className="border-t-2 border-[#2E1A57] bg-[#0A0518] shrink-0">
          {/* Dock Header Tabs */}
          <div className="px-3 py-1.5 bg-[#120A24] border-b border-[#2E1A57] flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setBottomOpen(!bottomOpen)}
                className="text-[#00F0FF] hover:text-white font-bold cursor-pointer pr-1"
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
                className={`px-2.5 py-1 text-xs font-pixel cursor-pointer border ${
                  activeTab === "console"
                    ? "bg-[#090514] border-[#00F0FF] text-[#00F0FF]"
                    : "border-transparent text-[#7A6E9B] hover:text-white"
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
                className={`px-2.5 py-1 text-xs font-pixel cursor-pointer border ${
                  activeTab === "stdin"
                    ? "bg-[#090514] border-[#00F0FF] text-[#00F0FF]"
                    : "border-transparent text-[#7A6E9B] hover:text-white"
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
                  className={`px-2.5 py-1 text-xs font-pixel cursor-pointer border ${
                    activeTab === "results"
                      ? "bg-[#090514] border-[#00FF9D] text-[#00FF9D]"
                      : "border-transparent text-[#7A6E9B] hover:text-white"
                  }`}
                >
                  TEST RESULTS {judgingResult && `[${judgingResult.overallVerdict}]`}
                </button>
              )}
            </div>

            <div className="flex items-center gap-3 text-[11px] text-[#7A6E9B]">
              <span>{code.length} bytes</span>
            </div>
          </div>

          {/* Dock Body Content */}
          {bottomOpen && (
            <div className="p-3 font-mono text-xs bg-[#06030D] h-44 overflow-y-auto select-text">
              {/* TAB 1: Console Execution Output */}
              {activeTab === "console" && (
                <div className="space-y-2">
                  {!executionResult && !isRunning && (
                    <div className="text-[#7A6E9B] space-y-1">
                      <p>&gt; Ready. Click &quot;RUN CODE ▶&quot; to execute your program against standard input.</p>
                      <p className="text-[11px]">
                        &gt; Target: {filename} &bull; Compiler: {LANGUAGE_DISPLAY_NAMES[activeLang]}
                      </p>
                    </div>
                  )}

                  {isRunning && (
                    <div className="text-[#00F0FF] animate-pulse">
                      &gt; Dispatching code to sandbox execution runner...
                    </div>
                  )}

                  {executionResult && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 flex-wrap border-b border-[#2E1A57] pb-1.5 text-[11px]">
                        <span
                          className={`font-pixel text-xs px-1.5 py-0.5 border ${
                            executionResult.status === "SUCCESS"
                              ? "border-[#00FF9D] text-[#00FF9D] bg-[#00FF9D]/10"
                              : "border-[#FF007A] text-[#FF007A] bg-[#FF007A]/10"
                          }`}
                        >
                          STATUS: {executionResult.status}
                        </span>
                        <span className="text-[#A79EC4]">
                          Exit code: {executionResult.exitCode ?? "N/A"}
                        </span>
                        <span className="text-[#A79EC4]">
                          Time: {executionResult.durationMs}ms
                        </span>
                      </div>

                      {executionResult.compilerOutput && (
                        <div className="space-y-1">
                          <span className="text-[#FF007A] font-bold">[COMPILER OUTPUT]</span>
                          <pre className="text-[#FF007A] whitespace-pre-wrap bg-[#120A24] p-2 border border-[#FF007A]/40">
                            {executionResult.compilerOutput}
                          </pre>
                        </div>
                      )}

                      {executionResult.stdout && (
                        <div className="space-y-1">
                          <span className="text-[#00FF9D] font-bold">[STANDARD OUTPUT]</span>
                          <pre className="text-white whitespace-pre-wrap bg-[#090514] p-2 border border-[#2E1A57]">
                            {executionResult.stdout}
                          </pre>
                        </div>
                      )}

                      {executionResult.stderr && (
                        <div className="space-y-1">
                          <span className="text-[#FF007A] font-bold">[STANDARD ERROR]</span>
                          <pre className="text-[#FF007A] whitespace-pre-wrap bg-[#120A24] p-2 border border-[#2E1A57]">
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
                  <div className="flex items-center justify-between text-[11px] text-[#7A6E9B]">
                    <span>Standard Input fed into RUN CODE:</span>
                    <button
                      type="button"
                      onClick={() => setCustomStdin("")}
                      className="hover:text-white underline cursor-pointer"
                    >
                      Clear Stdin
                    </button>
                  </div>
                  <textarea
                    value={customStdin}
                    onChange={(e) => setCustomStdin(e.target.value)}
                    placeholder="Type sample input here (e.g. 10 20)..."
                    className="flex-1 w-full bg-[#090514] border border-[#2E1A57] p-2 text-white font-mono text-xs resize-none focus:outline-none focus:border-[#00F0FF]"
                  />
                </div>
              )}

              {/* TAB 3: Test Results */}
              {activeTab === "results" && (
                <div className="space-y-3">
                  {!judgingResult && !isSubmitting && (
                    <div className="text-[#7A6E9B]">
                      &gt; Click &quot;SUBMIT SOLUTION ✔&quot; to evaluate your code against the problem test suite.
                    </div>
                  )}

                  {isSubmitting && (
                    <div className="text-[#00FF9D] animate-pulse">
                      &gt; Evaluating test cases against sandbox judge...
                    </div>
                  )}

                  {judgingResult && (
                    <div className="space-y-3">
                      {/* Overall Verdict Banner */}
                      <div className="flex items-center justify-between border-b border-[#2E1A57] pb-2 flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-pixel text-base px-2 py-0.5 border ${
                              judgingResult.overallVerdict === "ACCEPTED"
                                ? "border-[#00FF9D] text-[#00FF9D] bg-[#00FF9D]/15"
                                : "border-[#FF007A] text-[#FF007A] bg-[#FF007A]/15"
                            }`}
                          >
                            VERDICT: {judgingResult.overallVerdict}
                          </span>
                          <span className="text-[#A79EC4] text-xs">
                            Score: {judgingResult.passedTests} / {judgingResult.totalTests} ({judgingResult.scorePercentage}%)
                          </span>
                        </div>
                        <span className="text-[11px] text-[#7A6E9B]">
                          Max Time: {judgingResult.maxDurationMs}ms
                        </span>
                      </div>

                      {judgingResult.compilerOutput && (
                        <div className="space-y-1">
                          <span className="text-[#FF007A] font-bold">[COMPILATION ERROR]</span>
                          <pre className="text-[#FF007A] whitespace-pre-wrap bg-[#120A24] p-2 border border-[#FF007A]/40 text-xs">
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
                                ? "border-[#00FF9D]/40 bg-[#00FF9D]/5"
                                : "border-[#FF007A]/40 bg-[#FF007A]/5"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className={tc.passed ? "text-[#00FF9D]" : "text-[#FF007A]"}>
                                  {tc.passed ? "✔" : "✖"}
                                </span>
                                <span className="text-white font-bold">
                                  Test Case #{idx + 1}
                                </span>
                                {tc.isHidden && (
                                  <span className="text-[10px] px-1 bg-[#1B0F36] text-[#A79EC4] border border-[#2E1A57]">
                                    HIDDEN
                                  </span>
                                )}
                              </div>
                              <span
                                className={`text-[11px] font-bold ${
                                  tc.passed ? "text-[#00FF9D]" : "text-[#FF007A]"
                                }`}
                              >
                                {tc.verdict} ({tc.durationMs}ms)
                              </span>
                            </div>

                            {!tc.isHidden && (
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-1 text-[11px] font-mono text-[#A79EC4]">
                                <div>
                                  <span className="text-[#7A6E9B] block">Input:</span>
                                  <code className="text-white">{tc.input || "(empty)"}</code>
                                </div>
                                <div>
                                  <span className="text-[#7A6E9B] block">Expected:</span>
                                  <code className="text-[#00FF9D]">{tc.expectedOutput?.trim()}</code>
                                </div>
                                <div>
                                  <span className="text-[#7A6E9B] block">Actual Output:</span>
                                  <code className={tc.passed ? "text-white" : "text-[#FF007A]"}>
                                    {tc.actualOutput?.trim() || "(no output)"}
                                  </code>
                                </div>
                              </div>
                            )}

                            {tc.isHidden && (
                              <p className="text-[10px] text-[#7A6E9B] pt-0.5">
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
            className="w-full max-w-md border-2 border-[#FF007A] p-6 bg-[#120A24] shadow-[8px_8px_0px_#000000] space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 border-2 border-[#FF007A] bg-[#090514] flex items-center justify-center text-[#FF007A] font-pixel text-xl font-bold">
                !
              </div>
              <div>
                <h3 className="font-pixel text-lg text-white">
                  RESET WORKSPACE BUFFER?_
                </h3>
                <span className="font-mono text-xs text-[#A79EC4]">
                  Target: {filename}
                </span>
              </div>
            </div>

            <p className="text-xs text-[#A79EC4] leading-relaxed">
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
