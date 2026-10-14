"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useProfile } from "@/hooks/use-profile";
import { useChallengeSession } from "@/hooks/use-challenge-session";
import { PixelCard } from "@/components/retro/pixel-card";
import { PixelButton } from "@/components/retro/pixel-button";
import { DotIcon, type DotIconName } from "@/components/retro/dot-icon";
import { MonacoEditorPane } from "./monaco-editor-pane";
import { ProblemPane } from "./workspace/problem-pane";
import { ResultsPane, type ResultsTab } from "./workspace/results-pane";
import { DemoControls } from "./workspace/demo-controls";
import {
  SubmitConfirmModal,
  SubmissionEvaluatingModal,
  SubmissionResultModal,
  TimeExpiredModal,
} from "./workspace/submission-modals";
import { draftRepository } from "@/lib/storage/draft-repository";
import { recordCodingDay } from "@/lib/storage/coding-activity";
import { FileTabs } from "./workspace/file-tabs";
import type { WorkspaceFile } from "@/types/draft";
import {
  ALL_SUPPORTED_LANGUAGES,
  LANGUAGE_DISPLAY_NAMES,
  getFilenameForLanguage,
  getMonacoLanguage,
  getStarterCode,
} from "@/lib/workspace-defaults";
import {
  DEMO_PROBLEM_ID,
  DEMO_SOLVED_PYTHON,
  DEMO_INCORRECT_PYTHON,
  isCodeMatchingDemoSolved,
  isCodeMatchingDemoIncorrect,
  getSimulatedAcceptedResult,
  getSimulatedWrongAnswerResult,
} from "@/lib/demo/demo-simulation";
import type { ProblemSummary } from "@/types/problem";
import type { PreferredLanguage } from "@/types/profile";
import type { VisibleProblem } from "@/types/problem";
import type { ExecutionResult, SandboxHealth } from "@/types/execution";
import type { JudgingResult } from "@/lib/judge/judging-service";
import {
  Clock,
  AlertTriangle,
} from "lucide-react";

const LANGUAGE_ICONS: Record<PreferredLanguage, DotIconName> = {
  python: "python",
  java: "java",
  cpp: "cplusplus",
  c: "file",
};

type MobileActivePane = "problem" | "code" | "results";

export function WorkspaceView() {
  const { profile } = useProfile();
  const searchParams = useSearchParams();
  const problemIdParam = searchParams.get("problem");
  const demoParam = searchParams.get("demo");
  const challengeParam = searchParams.get("challenge");

  const challenge = useChallengeSession();

  // Active Language & Code
  const [userSelectedLang, setUserSelectedLang] = useState<PreferredLanguage | null>(null);
  const activeLang = userSelectedLang ?? profile?.preferredLanguage ?? "python";

  const [files, setFiles] = useState<WorkspaceFile[]>([{ name: "main.py", content: getStarterCode("python") }]);
  const filesRef = useRef(files);
  const mainFilename = getFilenameForLanguage(activeLang);
  const [activeFile, setActiveFile] = useState(mainFilename);
  const [resetAllFiles, setResetAllFiles] = useState(false);
  const code = files.find((file) => file.name === activeFile)?.content ?? "";
  const mainCode = files.find((file) => file.name === mainFilename)?.content ?? "";
  const updateFiles = (next: WorkspaceFile[]) => { filesRef.current = next; setFiles(next); };
  const [customStdin, setCustomStdin] = useState<string>("");
  const [saveStatus, setSaveStatus] = useState<"SAVED" | "SAVING..." | "MODIFIED">("SAVED");
  const [isResetOpen, setIsResetOpen] = useState<boolean>(false);
  const [isForfeitModalOpen, setIsForfeitModalOpen] = useState<boolean>(false);

  // Problem metadata
  const [problem, setProblem] = useState<VisibleProblem | null>(null);
  const [problemIds, setProblemIds] = useState<string[]>([]);

  // Layout & Tabs
  const [mobileActivePane, setMobileActivePane] = useState<MobileActivePane>("code");
  // Keeps Monaco mounted while letting students expand or restore the editor.
  const [editorExpanded, setEditorExpanded] = useState(false);
  const [activeResultsTab, setActiveResultsTab] = useState<ResultsTab>("console");

  // Execution & Judging state
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [judgingResult, setJudgingResult] = useState<JudgingResult | null>(null);
  const [isResultDemo, setIsResultDemo] = useState<boolean>(false);

  // Modals state
  const [isSubmitConfirmOpen, setIsSubmitConfirmOpen] = useState<boolean>(false);
  const [isEvaluatingModalOpen, setIsEvaluatingModalOpen] = useState<boolean>(false);
  const [isResultModalOpen, setIsResultModalOpen] = useState<boolean>(false);
  const [isExpiredModalDismissed, setIsExpiredModalDismissed] = useState<boolean>(false);

  // Sandbox Health
  const [sandboxHealth, setSandboxHealth] = useState<SandboxHealth | null>(null);

  // Demo Mode state
  const [userDemoToggle, setUserDemoToggle] = useState<boolean | null>(null);
  const isDemoMode =
    userDemoToggle ??
    Boolean(demoParam === "true" || demoParam === "1" || problemIdParam === DEMO_PROBLEM_ID);
  const [demoState, setDemoState] = useState<"idle" | "solved" | "incorrect" | "modified">("idle");
  const [demoNote, setDemoNote] = useState<string | null>(null);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Sandbox Health Check
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

  // 2. Problem Fetching
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
          if (isCurrent) setProblem(null);
        }
      } catch {
        if (isCurrent) setProblem(null);
      }
    }

    fetchProblem();
    return () => {
      isCurrent = false;
    };
  }, [problemIdParam]);

  useEffect(() => {
    let active = true;
    fetch("/api/problems")
      .then((response) => { if (!response.ok) throw new Error("Catalog unavailable"); return response.json(); })
      .then((data: { problems?: ProblemSummary[] }) => {
        if (active) setProblemIds((data.problems ?? []).map((entry) => entry.id));
      })
      .catch(() => { if (active) setProblemIds([]); });
    return () => { active = false; };
  }, []);

  // 3. Timed Challenge initialization if requested via URL
  useEffect(() => {
    if (challengeParam === "true" && problem && challenge.status !== "active") {
      challenge.startChallenge(problem.id, problem.title);
    }
  }, [challengeParam, problem, challenge]);

  // 4. Load the profile's existing single-file or multi-file draft.
  useEffect(() => {
    if (!profile) return;
    let current = true;
    const starter = problem?.starterCodes[activeLang] || getStarterCode(activeLang);
    const primaryName = getFilenameForLanguage(activeLang);
    draftRepository.getDraft(profile.id, activeLang)
      .then((draft) => {
        if (!current) return;
        const loaded = draft?.files?.length
          ? draft.files
          : [{ name: primaryName, content: draft?.code?.trim() ? draft.code : starter }];
        const primary = loaded.find((file) => file.name === primaryName);
        const normalized = [
          { name: primaryName, content: primary?.content ?? starter },
          ...loaded.filter((file) => file.name !== primaryName),
        ];
        updateFiles(normalized);
        setActiveFile(primaryName);
        setSaveStatus("SAVED");
      })
      .catch(() => {
        if (!current) return;
        updateFiles([{ name: primaryName, content: starter }]);
        setActiveFile(primaryName);
        setSaveStatus("SAVED");
      });
    return () => { current = false; };
  }, [profile, activeLang, problem]);

  const persistFiles = useCallback((next: WorkspaceFile[]) => {
    filesRef.current = next;
    setFiles(next);
    setSaveStatus("MODIFIED");
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      if (!profile) return;
      setSaveStatus("SAVING...");
      try {
        await draftRepository.saveDraft(profile.id, activeLang, next[0]?.content ?? "", next);
        recordCodingDay(profile.id);
        setSaveStatus("SAVED");
      } catch {
        setSaveStatus("MODIFIED");
      }
    }, 600);
  }, [profile, activeLang]);

  const handleCodeChange = useCallback((newCode: string) => {
    const next = filesRef.current.map((file) =>
      file.name === activeFile ? { ...file, content: newCode } : file
    );
    persistFiles(next);

    if (isDemoMode) {
      if (activeFile === mainFilename && isCodeMatchingDemoSolved(newCode)) {
        setDemoState("solved"); setDemoNote(null);
      } else if (activeFile === mainFilename && isCodeMatchingDemoIncorrect(newCode)) {
        setDemoState("incorrect"); setDemoNote(null);
      } else {
        setDemoState("modified");
        setDemoNote("Custom code not evaluated (execute in sandbox or load demo preset)");
      }
    }
  }, [activeFile, mainFilename, isDemoMode, persistFiles]);

  const updateSingleFile = (name: string, content: string) => {
    persistFiles(filesRef.current.map((file) => file.name === name ? { ...file, content } : file));
  };

  const onFileAdd = (name: string) => {
    persistFiles([...filesRef.current, { name, content: "" }]);
    setActiveFile(name);
  };
  const onFileRename = (previous: string, name: string) => {
    persistFiles(filesRef.current.map((file) => file.name === previous ? { ...file, name } : file));
    setActiveFile(name);
  };
  const onFileClose = (name: string) => {
    persistFiles(filesRef.current.filter((file) => file.name !== name));
    if (activeFile === name) setActiveFile(mainFilename);
  };

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // 6. Language Switch
  const handleSwitchLanguage = async (newLang: PreferredLanguage) => {
    if (newLang === activeLang) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    if (profile && saveStatus !== "SAVED") {
      try {
        await draftRepository.saveDraft(profile.id, activeLang, filesRef.current[0]?.content ?? "", filesRef.current);
      } catch {
        // continue
      }
    }

    setUserSelectedLang(newLang);
  };

  // 7. Reset only the current tab unless the user selects Reset all.
  const handleConfirmReset = async () => {
    if (!profile) return;
    const starter = problem?.starterCodes[activeLang] || getStarterCode(activeLang);
    const next = resetAllFiles
      ? [{ name: mainFilename, content: starter }]
      : filesRef.current.map((file) =>
          file.name === activeFile
            ? { ...file, content: file.name === mainFilename ? starter : "" }
            : file
        );
    try {
      await draftRepository.saveDraft(profile.id, activeLang, next[0]?.content ?? "", next);
      updateFiles(next);
      if (resetAllFiles) setActiveFile(mainFilename);
      setSaveStatus("SAVED");
      setIsResetOpen(false);
      setResetAllFiles(false);
      setDemoState("idle"); setDemoNote(null);
    } catch {
      setSaveStatus("MODIFIED");
    }
  };

  // 8. Download File
  const handleDownloadFile = () => {
    const filename = activeFile;
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

  // 9. Run Code against Sandbox
  const handleRunCode = async () => {
    setIsRunning(true);
    setActiveResultsTab("console");
    setMobileActivePane("results");

    try {
      const res = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: activeLang,
          sourceCode: mainCode,
          files,
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

  // 10. Open Submission Confirmation
  const handleOpenSubmitModal = () => {
    if (!problem) return;
    setIsSubmitConfirmOpen(true);
  };

  // 11. Execute Genuine Submission Judging
  const handleConfirmSubmission = async () => {
    if (!problem) return;
    setIsSubmitConfirmOpen(false);
    setIsEvaluatingModalOpen(true);
    setActiveResultsTab("results");
    setMobileActivePane("results");
    setIsSubmitting(true);
    setIsResultDemo(false);

    try {
      const res = await fetch("/api/judge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problemId: problem.id,
          language: activeLang,
          sourceCode: mainCode,
          files,
        }),
      });

      const data = (await res.json()) as JudgingResult;
      setJudgingResult(data);
      if (challenge.isTimedActive) {
        challenge.recordSubmissionAttempt(data.overallVerdict);
      }
      setIsEvaluatingModalOpen(false);
      setIsResultModalOpen(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const fallbackResult: JudgingResult = {
        problemId: problem.id,
        language: activeLang,
        overallVerdict: "INTERNAL_JUDGE_ERROR",
        passedTests: 0,
        totalTests: problem.visibleTestCases.length,
        scorePercentage: 0,
        maxDurationMs: 0,
        testResults: [],
        error: `Submission failed: ${msg}`,
      };
      setJudgingResult(fallbackResult);
      if (challenge.isTimedActive) {
        challenge.recordSubmissionAttempt("INTERNAL_JUDGE_ERROR");
      }
      setIsEvaluatingModalOpen(false);
      setIsResultModalOpen(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 12. Demo Controls Handlers
  const handleLoadDemoSolved = () => {
    setUserSelectedLang("python");
    setActiveFile("main.py");
    updateSingleFile("main.py", DEMO_SOLVED_PYTHON);
    setDemoState("solved");
    setDemoNote(null);
    setSaveStatus("SAVED");
  };

  const handleLoadDemoIncorrect = () => {
    setUserSelectedLang("python");
    setActiveFile("main.py");
    updateSingleFile("main.py", DEMO_INCORRECT_PYTHON);
    setDemoState("incorrect");
    setDemoNote(null);
    setSaveStatus("SAVED");
  };

  const handleResetDemo = () => {
    if (problem && problem.starterCodes["python"]) {
      updateSingleFile("main.py", problem.starterCodes["python"]);
    } else {
      updateSingleFile("main.py", getStarterCode("python"));
    }
    setDemoState("idle");
    setDemoNote(null);
    setJudgingResult(null);
    setExecutionResult(null);
    setSaveStatus("SAVED");
  };

  const handlePreviewAccepted = () => {
    const simResult = getSimulatedAcceptedResult();
    setJudgingResult(simResult);
    setIsResultDemo(true);
    setActiveResultsTab("results");
    setMobileActivePane("results");
    setIsResultModalOpen(true);
    if (challenge.isTimedActive) {
      challenge.recordSubmissionAttempt("ACCEPTED");
    }
  };

  const handlePreviewWrongAnswer = () => {
    const simResult = getSimulatedWrongAnswerResult();
    setJudgingResult(simResult);
    setIsResultDemo(true);
    setActiveResultsTab("results");
    setMobileActivePane("results");
    setIsResultModalOpen(true);
    if (challenge.isTimedActive) {
      challenge.recordSubmissionAttempt("WRONG_ANSWER");
    }
  };

  // 13. Next Problem Resolution
  const nextProblemId = useMemo(() => {
    if (!problem) return null;
    const currentIndex = problemIds.indexOf(problem.id);
    if (currentIndex >= 0 && currentIndex < problemIds.length - 1) {
      return problemIds[currentIndex + 1];
    }
    return problemIds[0] !== problem.id ? (problemIds[0] ?? null) : null;
  }, [problem, problemIds]);

  const filename = activeFile;
  const monacoLang = getMonacoLanguage(activeLang);

  return (
    <div className="workspace-view flex flex-col h-[calc(100vh-120px)] min-h-[640px] space-y-3">
      {/* Sandbox Offline Warning Banner */}
      {sandboxHealth && !sandboxHealth.isAvailable && (
        <div className="px-3.5 py-2 bg-[var(--color-elevated)] border-2 border-[var(--color-pink)] text-xs font-mono text-[var(--color-text-main)] flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0 animate-fade-in">
          <div className="flex items-center gap-2 text-[var(--color-pink)]">
            <AlertTriangle size={15} />
            <span className="font-bold">
              SANDBOX OFFLINE: Piston container is not running on port 2000.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[0.6875rem] text-[var(--color-text-muted)] bg-[var(--color-canvas)] px-2 py-0.5 border border-[var(--color-border)] select-all">
              docker run -d -p 2000:2000 ghcr.io/engineerman/piston/piston
            </span>
            <button
              type="button"
              onClick={() => setUserDemoToggle(true)}
              className="text-[0.6875rem] text-[var(--color-accent)] underline hover:text-[var(--color-text-main)] cursor-pointer"
            >
              Enable Demo Mode &rarr;
            </button>
          </div>
        </div>
      )}

      {/* Timed Challenge Active Banner */}
      {challenge.isTimedActive && (
        <div
          className={`px-3.5 py-2 border-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0 transition-colors ${
            challenge.isWarningTime
              ? "bg-[var(--color-pink)]/15 border-[var(--color-pink)] animate-pulse"
              : "bg-[var(--color-canvas)] border-[var(--color-accent)]"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 font-heading text-sm text-[var(--color-accent)]">
              <Clock
                size={16}
                className={challenge.isWarningTime ? "text-[var(--color-pink)] animate-bounce" : "text-[var(--color-accent)]"}
              />
              <span>TIMED CHALLENGE ACTIVE:</span>
            </div>
            <span
              className={`font-mono text-base font-bold tracking-wider px-2 py-0.5 border ${
                challenge.isWarningTime
                  ? "border-[var(--color-pink)] text-[var(--color-pink)] bg-[var(--color-pink)]/20"
                  : "border-[var(--color-mint)] text-[var(--color-mint)] bg-[var(--color-mint)]/10"
              }`}
            >
              {challenge.formattedTime}
            </span>
            <span className="text-xs font-mono text-[var(--color-text-muted)] hidden md:inline">
              Submissions: {challenge.session?.submissionCount ?? 0}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <PixelButton
              variant={challenge.hasSubmittedAtLeastOnce ? "primary" : "ghost"}
              size="sm"
              onClick={() => {
                const finished = challenge.finishChallenge();
                if (finished) {
                  alert("Challenge completed! Congratulations on finishing.");
                }
              }}
              disabled={!challenge.hasSubmittedAtLeastOnce}
              className="text-xs"
              title={
                challenge.hasSubmittedAtLeastOnce
                  ? "Finish and submit challenge"
                  : "Submit solution at least once to enable finishing challenge"
              }
            >
              FINISH CHALLENGE ✔
            </PixelButton>

            <PixelButton
              variant="pink"
              size="sm"
              onClick={() => setIsForfeitModalOpen(true)}
              className="text-xs"
            >
              FORFEIT / EXIT ✖
            </PixelButton>
          </div>
        </div>
      )}

      {/* Demo Controls Bar */}
      {isDemoMode && (
        <DemoControls
          onLoadSolved={handleLoadDemoSolved}
          onLoadIncorrect={handleLoadDemoIncorrect}
          onResetDemo={handleResetDemo}
          onPreviewAccepted={handlePreviewAccepted}
          onPreviewWrongAnswer={handlePreviewWrongAnswer}
          demoState={demoState}
        />
      )}

      {/* Responsive Mobile / Tablet View Switcher (Hidden on Desktop >= 1280px) */}
      <div className="xl:hidden flex items-center justify-between p-1.5 bg-[var(--color-surface)] border-2 border-[var(--color-border)] shrink-0 gap-1">
        <button
          type="button"
          onClick={() => setMobileActivePane("problem")}
          className={`flex-1 py-1.5 px-2 text-xs font-heading flex items-center justify-center gap-1.5 border transition-colors cursor-pointer ${
            mobileActivePane === "problem"
              ? "bg-[var(--color-canvas)] border-[var(--color-accent)] text-[var(--color-accent)] [box-shadow:var(--shadow-btn)]"
              : "border-transparent text-[var(--color-text-dim)] hover:text-[var(--color-text-main)]"
          }`}
        >
          <DotIcon name="list" size={13} aria-hidden="true" />
          <span>PROBLEM</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileActivePane("code")}
          className={`flex-1 py-1.5 px-2 text-xs font-heading flex items-center justify-center gap-1.5 border transition-colors cursor-pointer ${
            mobileActivePane === "code"
              ? "bg-[var(--color-canvas)] border-[var(--color-accent)] text-[var(--color-accent)] [box-shadow:var(--shadow-btn)]"
              : "border-transparent text-[var(--color-text-dim)] hover:text-[var(--color-text-main)]"
          }`}
        >
          <DotIcon name="file" size={13} aria-hidden="true" />
          <span>CODE</span>
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              saveStatus === "SAVED" ? "bg-[var(--color-mint)]" : "bg-[var(--color-pink)]"
            }`}
          />
        </button>

        <button
          type="button"
          onClick={() => setMobileActivePane("results")}
          className={`flex-1 py-1.5 px-2 text-xs font-heading flex items-center justify-center gap-1.5 border transition-colors cursor-pointer ${
            mobileActivePane === "results"
              ? "bg-[var(--color-canvas)] border-[var(--color-accent)] text-[var(--color-accent)] [box-shadow:var(--shadow-btn)]"
              : "border-transparent text-[var(--color-text-dim)] hover:text-[var(--color-text-main)]"
          }`}
        >
          <DotIcon name="powershell" size={13} adaptive aria-hidden="true" />
          <span>RESULTS</span>
          {judgingResult && (
            <span
              className={`text-[0.5625rem] font-mono px-1 py-0.2 border ${
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

      {/* Main Three-Pane Problem Lab Workspace */}
      <div id="workspace-panes" data-editor-expanded={editorExpanded} className={`flex-1 min-h-0 xl:grid xl:gap-3 flex flex-col overflow-hidden ${editorExpanded ? "xl:grid-cols-[minmax(0,1fr)]" : "xl:grid-cols-[29%_minmax(0,1fr)_27%]"}`}>
        {/* LEFT PANE: Problem Statement */}
        <div
          className={`h-full min-h-0 ${
            mobileActivePane === "problem" ? "flex flex-col flex-1" : "hidden"
          } ${editorExpanded ? "xl:hidden" : "xl:flex xl:flex-col"
          }`}
        >
          <ProblemPane
            problem={problem}
            onUseCustomStdin={(sampleInput) => {
              setCustomStdin(sampleInput);
              setActiveResultsTab("stdin");
              setMobileActivePane("results");
            }}
          />
        </div>

        {/* CENTER PANE: Code Editor & Actions Toolbar */}
        <div
          className={`h-full min-h-0 flex flex-col space-y-2 ${
            mobileActivePane === "code" ? "flex flex-col flex-1" : "hidden xl:flex xl:flex-col"
          }`}
        >
          {/* Editor Header Toolbar */}
          <PixelCard
            variant="default"
            className="p-2 sm:p-2.5 border-2 border-[var(--color-border)] bg-[var(--color-surface)] flex flex-wrap items-center justify-between gap-2 shrink-0"
          >
            {/* Left: Active File Tab & Languages */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[var(--color-canvas)] border border-[var(--color-accent)] text-[var(--color-text-main)]">
                <DotIcon name={LANGUAGE_ICONS[activeLang]} size={14} color="var(--color-accent)" />
                <span className="font-heading text-xs">{filename}</span>
                <span
                  className={`w-1.5 h-1.5 rounded-full ml-0.5 ${
                    saveStatus === "SAVED"
                      ? "bg-[var(--color-mint)]"
                      : saveStatus === "SAVING..."
                      ? "bg-[var(--color-accent)] animate-pulse"
                      : "bg-[var(--color-pink)]"
                  }`}
                  title={`Buffer: ${saveStatus}`}
                />
              </div>

              {/* Language Switchers */}
              <div className="flex items-center gap-1 bg-[var(--color-canvas)] p-0.5 border border-[var(--color-border)]">
                {ALL_SUPPORTED_LANGUAGES.map((lang) => {
                  const isCurrent = activeLang === lang;
                  return (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => handleSwitchLanguage(lang)}
                      className={`px-2 py-0.5 text-[0.6875rem] font-mono transition-colors cursor-pointer ${
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

              {/* Demo Mode Toggle Button */}
              <button
                type="button"
                onClick={() => setUserDemoToggle(!isDemoMode)}
                className={`px-2 py-1 text-[0.625rem] font-mono border flex items-center gap-1 cursor-pointer transition-colors ${
                  isDemoMode
                    ? "bg-[var(--color-elevated)] border-[var(--color-accent)] text-[var(--color-accent)] font-bold"
                    : "border-[var(--color-border)] text-[var(--color-text-dim)] hover:text-[var(--color-text-main)]"
                }`}
                title="Toggle development demo utilities"
              >
                <DotIcon name="stars" size={11} adaptive aria-hidden="true" />
                <span>DEMO</span>
              </button>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                aria-label={editorExpanded ? "Restore problem and results panels" : "Expand code editor"}
                aria-pressed={editorExpanded}
                aria-controls="workspace-panes"
                title={editorExpanded ? "Restore three-panel workspace" : "Expand the editor to use the full workspace"}
                onClick={() => setEditorExpanded((current) => !current)}
                className="hidden xl:inline-flex items-center gap-1.5 rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-2 text-xs font-medium text-[var(--color-text-main)] hover:bg-[var(--color-elevated)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]"
              >
                <DotIcon name={editorExpanded ? "list" : "box"} size={14} aria-hidden="true" />
                {editorExpanded ? "Restore panels" : "Expand editor"}
              </button>
              {editorExpanded && (executionResult || judgingResult) && (
                <button
                  type="button"
                  onClick={() => {
                    setEditorExpanded(false);
                    setActiveResultsTab(judgingResult ? "results" : "console");
                  }}
                  className="hidden xl:inline-flex items-center gap-1.5 rounded-[var(--radius-btn)] border border-[var(--color-border)] px-2.5 py-2 text-xs font-medium text-[var(--color-text-main)] hover:bg-[var(--color-elevated)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]"
                >
                  <DotIcon name="circleCheck" size={14} aria-hidden="true" />
                  View results
                </button>
              )}
              <PixelButton
                variant="ghost"
                size="sm"
                onClick={() => setIsResetOpen(true)}
                className="text-[0.6875rem] py-1 px-2"
                title="Reset buffer to starter code"
              >
                RESET ↺
              </PixelButton>

              <PixelButton
                variant="ghost"
                size="sm"
                onClick={handleDownloadFile}
                className="text-[0.6875rem] py-1 px-2"
                title="Download source code"
              >
                SAVE ↓
              </PixelButton>

              {/* Run Code Button */}
              <PixelButton
                variant="cyan"
                size="sm"
                onClick={handleRunCode}
                disabled={isRunning}
                className="text-[0.6875rem] py-1 px-2.5 font-heading"
              >
                <DotIcon name="circlePlay" size={14} aria-hidden="true" />
                {isRunning ? "RUNNING..." : "RUN"}
              </PixelButton>

              {/* Submit Solution Button */}
              {problem && (
                <PixelButton
                  variant="primary"
                  size="sm"
                  onClick={handleOpenSubmitModal}
                  disabled={isSubmitting}
                  className="text-[0.6875rem] py-1 px-2.5 font-heading"
                >
                  <DotIcon name="circleCheck" size={14} aria-hidden="true" />
                  {isSubmitting ? "JUDGING..." : "SUBMIT"}
                </PixelButton>
              )}
            </div>
          </PixelCard>

          {/* Monaco Editor Frame */}
          <div className="flex-1 min-h-0 border-2 border-[var(--color-border)] bg-[var(--color-canvas)] [border-radius:var(--radius-card)] overflow-hidden relative">
            <MonacoEditorPane
              language={monacoLang}
              value={code}
              onChange={handleCodeChange}
            />
          </div>
        </div>

        {/* RIGHT PANE: Execution Console, Stdin, Test Results */}
        <div
          className={`h-full min-h-0 ${
            mobileActivePane === "results" ? "flex flex-col flex-1" : "hidden"
          } ${editorExpanded ? "xl:hidden" : "xl:flex xl:flex-col"
          }`}
        >
          <ResultsPane
            activeTab={activeResultsTab}
            onTabChange={setActiveResultsTab}
            isRunning={isRunning}
            isSubmitting={isSubmitting}
            executionResult={executionResult}
            judgingResult={judgingResult}
            customStdin={customStdin}
            onCustomStdinChange={setCustomStdin}
            activeLanguage={activeLang}
            filename={filename}
            isDemoMode={isDemoMode}
            demoNote={demoNote}
          />
        </div>
      </div>

      {/* MODAL 1: Submit Confirmation Dialog */}
      {problem && (
        <SubmitConfirmModal
          isOpen={isSubmitConfirmOpen}
          onClose={() => setIsSubmitConfirmOpen(false)}
          onConfirm={handleConfirmSubmission}
          problem={problem}
          language={activeLang}
          isTimedActive={challenge.isTimedActive}
          formattedRemainingTime={challenge.formattedTime}
        />
      )}

      {/* MODAL 2: Submission In-Progress Evaluating Dialog */}
      {problem && (
        <SubmissionEvaluatingModal
          isOpen={isEvaluatingModalOpen}
          problem={problem}
          language={activeLang}
        />
      )}

      {/* MODAL 3: Submission Result Verdict Dialog */}
      {problem && (
        <SubmissionResultModal
          isOpen={isResultModalOpen}
          onClose={() => setIsResultModalOpen(false)}
          result={judgingResult}
          problem={problem}
          isDemo={isResultDemo}
          onViewDetails={() => {
            setActiveResultsTab("results");
            setMobileActivePane("results");
          }}
          nextProblemId={nextProblemId}
        />
      )}

      {/* MODAL 4: Timed Challenge Expired Dialog */}
      <TimeExpiredModal
        isOpen={challenge.status === "expired" && !isExpiredModalDismissed}
        onClose={() => setIsExpiredModalDismissed(true)}
        submissionCount={challenge.session?.submissionCount ?? 0}
        lastVerdict={challenge.session?.lastVerdict}
      />

      {/* MODAL 5: Reset Buffer Confirmation Modal */}
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
              This will reset your current buffer for <strong>{filename}</strong> back to starter code. Any unsaved modifications in this buffer will be lost.
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

      {/* MODAL 6: Forfeit Challenge Confirmation Modal */}
      {isForfeitModalOpen && (
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
                  FORFEIT TIMED CHALLENGE?_
                </h3>
                <span className="font-mono text-xs text-[var(--color-pink)]">
                  Time Remaining: {challenge.formattedTime}
                </span>
              </div>
            </div>

            <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
              Are you sure you want to forfeit this challenge session? Your timed countdown will end immediately and this session will be marked as forfeited. Your code in the buffer will remain intact.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <PixelButton
                variant="ghost"
                size="sm"
                onClick={() => setIsForfeitModalOpen(false)}
              >
                RESUME CHALLENGE
              </PixelButton>
              <PixelButton
                variant="pink"
                size="sm"
                onClick={() => {
                  challenge.forfeitChallenge();
                  setIsForfeitModalOpen(false);
                }}
              >
                CONFIRM FORFEIT ✖
              </PixelButton>
            </div>
          </PixelCard>
        </div>
      )}
    </div>
  );
}
