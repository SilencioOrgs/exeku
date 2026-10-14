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
import { Group, Panel, Separator, useGroupRef } from "react-resizable-panels";
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
  const [layout, setLayout] = useState<"split" | "wide" | "focus">("split");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [problemSlideOpen, setProblemSlideOpen] = useState(false);
  const resizeGroupRef = useGroupRef();
  const [splitSizes, setSplitSizes] = useState({ problem: 28, editor: 48, results: 24 });
  const nextLayout = () => setLayout((current) => current === "split" ? "wide" : current === "wide" ? "focus" : "split");

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const stored = localStorage.getItem("exeku.workspace.layout");
        if (stored === "split" || stored === "wide" || stored === "focus") setLayout(stored);
        const widths = JSON.parse(localStorage.getItem("exeku.workspace.panes") || "null");
        if (widths && typeof widths.problem === "number" && typeof widths.editor === "number" && typeof widths.results === "number"
            && widths.problem >= 20 && widths.editor >= 35 && widths.results >= 18
            && Math.abs(widths.problem + widths.editor + widths.results - 100) < 1) {
          setSplitSizes(widths);
        }
      } catch { /* local preference storage may be unavailable */ }
    });
  }, []);

  useEffect(() => {
    try { localStorage.setItem("exeku.workspace.layout", layout); } catch { /* local-only preference */ }
    const widths = layout === "split" ? splitSizes :
      layout === "wide" ? { problem: 4, editor: 72, results: 24 } :
      { problem: 0, editor: drawerOpen ? 65 : 100, results: drawerOpen ? 35 : 0 };
    const frame = requestAnimationFrame(() => resizeGroupRef.current?.setLayout(widths));
    return () => cancelAnimationFrame(frame);
  }, [layout, drawerOpen, splitSizes, resizeGroupRef]);

  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (problemSlideOpen) { setProblemSlideOpen(false); return; }
      if (layout === "focus") setLayout("split");
    };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [layout, problemSlideOpen]);
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
  const [offlineDismissed, setOfflineDismissed] = useState(false);

  // Demo Mode state
  const [userDemoToggle, setUserDemoToggle] = useState<boolean | null>(null);
  const isDemoMode =
    userDemoToggle ??
    Boolean(demoParam === "true" || demoParam === "1" || problemIdParam === DEMO_PROBLEM_ID);
  const [demoState, setDemoState] = useState<"idle" | "solved" | "incorrect" | "modified">("idle");
  const [demoNote, setDemoNote] = useState<string | null>(null);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      try { setOfflineDismissed(sessionStorage.getItem("exeku.workspace.sandbox-dismissed") === "1"); } catch { /* restricted */ }
    });
  }, []);

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
    setDrawerOpen(true);
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
    setDrawerOpen(true);
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

  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key !== "Enter") return;
      event.preventDefault();
      if (isRunning || isSubmitting) return;
      if (event.shiftKey) {
        if (problem) handleOpenSubmitModal();
      } else {
        void handleRunCode();
      }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  });

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
    <div className="workspace-view flex min-h-[420px] h-[calc(100dvh-90px)] flex-col gap-2 overflow-hidden">
      {/* Slim dismissible offline notice; no execution fallbacks. */}
      {sandboxHealth && !sandboxHealth.isAvailable && !offlineDismissed && (
        <div className="flex h-8 min-w-0 shrink-0 items-center gap-2 overflow-hidden border border-[var(--color-pink)] bg-[var(--color-elevated)] px-2 text-[11px] text-[var(--color-text-main)]">
          <AlertTriangle size={13} className="shrink-0 text-[var(--color-pink)]" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate">Sandbox offline: Piston not running on :2000</span>
          <button
            type="button" title="Copy command to start Piston" aria-label="Copy docker command"
            onClick={() => void navigator.clipboard?.writeText("docker run -d -p 2000:2000 ghcr.io/engineerman/piston/piston")}
            className="h-7 shrink-0 px-1 text-[var(--color-accent)] hover:underline"
          ><DotIcon name="file" size={14} aria-hidden="true" /></button>
          <button type="button" className="h-7 shrink-0 whitespace-nowrap text-[var(--color-accent)] hover:underline" onClick={() => setUserDemoToggle(true)}>Enable Demo Mode</button>
          <button type="button" title="Dismiss for this session" aria-label="Dismiss sandbox notice" className="h-7 w-6 shrink-0 text-base" onClick={() => {
            setOfflineDismissed(true);
            try { sessionStorage.setItem("exeku.workspace.sandbox-dismissed", "1"); } catch { /* restricted */ }
          }}>×</button>
        </div>
      )}

      {/* Timed Challenge Active Banner */}
      {challenge.isTimedActive && (
        <div
          className={`px-2 py-1 border flex flex-wrap items-center justify-between gap-2 shrink-0 text-[0.6875rem] transition-colors ${
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
              className="text-[0.6875rem] py-0"
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
      <div
        id="workspace-panes"
        className="workspace-panes flex-1 min-h-0 min-w-0"
        data-layout={layout}
        data-mobile-pane={mobileActivePane}
      >
        <Group
          id="exeku-workspace-resizable"
          groupRef={resizeGroupRef}
          orientation={layout === "focus" ? "vertical" : "horizontal"}
          defaultLayout={{ problem: 28, editor: 48, results: 24 }}
          onLayoutChanged={(sizes, meta) => {
            if (layout !== "split" || !meta.isUserInteraction) return;
            if (sizes.problem >= 20 && sizes.editor >= 35 && sizes.results >= 18) {
              setSplitSizes(sizes);
              try { localStorage.setItem("exeku.workspace.panes", JSON.stringify(sizes)); } catch { /* storage restricted */ }
            }
          }}
          className="workspace-resizable-group h-full min-h-0 min-w-0"
        >
        {/* LEFT PANE: Problem Statement */}
        <Panel id="problem" defaultSize="28%" minSize={layout === "split" ? "20%" : "0%"} collapsible={layout !== "split"} collapsedSize="0%">
        <div
          className={`h-full min-h-0 ${
            mobileActivePane === "problem" ? "flex flex-col flex-1" : "hidden"
          } ${layout === "focus" ? "xl:hidden" : "xl:flex xl:flex-col"
          }`}
        >
          {layout === "wide" ? (
            <button
              type="button"
              className="hidden xl:flex h-full w-10 items-center justify-center border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text-muted)]"
              aria-label="Expand problem pane"
              onClick={() => setLayout("split")}
            ><span className="[writing-mode:vertical-rl]">PROBLEM ›</span></button>
          ) :           <ProblemPane
            problem={problem}
            onUseCustomStdin={(sampleInput) => {
              setCustomStdin(sampleInput);
              setActiveResultsTab("stdin");
              setMobileActivePane("results");
            }}
          />}

        </div>

        </Panel>
        <Separator className="workspace-resize-handle" />

        {/* CENTER PANE: Code Editor & Actions Toolbar */}
        <Panel id="editor" defaultSize="48%" minSize={layout === "focus" ? "30%" : "35%"}>
        <div
          className={`h-full min-h-0 flex flex-col gap-1 ${
            mobileActivePane === "code" ? "flex flex-col flex-1" : "hidden xl:flex xl:flex-col"
          }`}
        >
          {/* Compact editor toolbar, one line at desktop widths. */}
          <div className="workspace-toolbar flex h-10 shrink-0 items-center gap-1.5 overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface)] px-1.5 data-[density=compact]:h-9">
            <FileTabs
              language={activeLang}
              files={files}
              mainName={mainFilename}
              activeName={activeFile}
              saveStatus={saveStatus}
              onSelect={setActiveFile}
              onAdd={onFileAdd}
              onRename={onFileRename}
              onClose={onFileClose}
            />
            <select
              aria-label="Programming language"
              value={activeLang}
              onChange={(e) => void handleSwitchLanguage(e.target.value as PreferredLanguage)}
              className="h-8 w-[76px] shrink-0 border border-[var(--color-border)] bg-[var(--color-canvas)] px-1 text-[11px] text-[var(--color-text-main)] sm:w-[100px]"
            >
              {ALL_SUPPORTED_LANGUAGES.map((lang) => <option key={lang} value={lang}>{LANGUAGE_DISPLAY_NAMES[lang]}</option>)}
            </select>
            <button
              type="button"
              aria-pressed={isDemoMode}
              onClick={() => setUserDemoToggle(!isDemoMode)}
              title="Toggle frontend-only demo"
              className={`h-6 shrink-0 rounded-[var(--radius-btn)] border px-1.5 text-[10px] ${isDemoMode ? "border-[var(--color-accent)] text-[var(--color-accent)]" : "border-[var(--color-border)]"}`}
            >DEMO</button>
            <span className="hidden h-5 shrink-0 border-l border-[var(--color-border)] sm:inline" aria-hidden="true" />
            <PixelButton size="icon" variant="ghost" onClick={() => setIsResetOpen(true)} aria-label="Reset active file" title="Reset active file">
              <DotIcon name="arrowRight" className="rotate-180" size={14} aria-hidden="true" />
            </PixelButton>
            <PixelButton size="icon" variant="ghost" onClick={handleDownloadFile} aria-label="Download active file" title="Download active file">
              <DotIcon name="file" size={14} aria-hidden="true" />
            </PixelButton>
            <PixelButton
              size="icon" variant="ghost" className="hidden xl:inline-flex"
              aria-label={`Cycle editor layout (currently ${layout})`}
              aria-controls="workspace-panes"
              onClick={nextLayout}
              title={`Layout: ${layout}. Click to cycle split, wide and focus`}
            >
              <DotIcon name={layout === "focus" ? "list" : "box"} size={14} aria-hidden="true" />
            </PixelButton>
            {layout === "focus" && (
              <button
                type="button" className="hidden h-8 shrink-0 items-center gap-1 border border-[var(--color-border)] px-2 text-xs xl:inline-flex"
                onClick={() => setProblemSlideOpen(true)}
                aria-label="Open problem statement"
              ><DotIcon name="list" size={14} aria-hidden="true" /> Problem</button>
            )}
            <span className="hidden h-5 shrink-0 border-l border-[var(--color-border)] sm:inline" aria-hidden="true" />
            <PixelButton size="xs" variant="cyan" aria-label="Run code" title="Run code (Ctrl/Cmd+Enter)"
              disabled={isRunning || isSubmitting} onClick={() => void handleRunCode()} className="shrink-0">
              <DotIcon name="circlePlay" size={14} aria-hidden="true" /><span className="hidden sm:inline">{isRunning ? "RUNNING" : "RUN"}</span>
            </PixelButton>
            <PixelButton size="xs" variant="primary" aria-label="Submit solution" title="Submit solution (Ctrl/Cmd+Shift+Enter)"
              disabled={!problem || isRunning || isSubmitting} onClick={handleOpenSubmitModal} className="shrink-0">
              <DotIcon name="circleCheck" size={14} aria-hidden="true" /><span className="hidden sm:inline">{isSubmitting ? "JUDGING" : "SUBMIT"}</span>
            </PixelButton>
          </div>

          {/* Monaco Editor Frame */}
          <div className="flex-1 min-h-0 border-2 border-[var(--color-border)] bg-[var(--color-canvas)] [border-radius:var(--radius-card)] overflow-hidden relative">
            <MonacoEditorPane
              language={monacoLang}
              value={code}
              path={`/${profile?.id ?? "guest"}/${problem?.id ?? "free"}/${activeLang}/${activeFile}`}
              onChange={handleCodeChange}
              onRun={() => { if (!isRunning && !isSubmitting) void handleRunCode(); }}
              onSubmit={() => { if (problem && !isRunning && !isSubmitting) handleOpenSubmitModal(); }}
            />
          </div>
        </div>

        </Panel>
        <Separator className="workspace-resize-handle" />

        {/* RIGHT PANE: Execution Console, Stdin, Test Results */}
        <Panel id="results" defaultSize="24%" minSize={layout === "focus" ? "0%" : "18%"} collapsible={layout === "focus"} collapsedSize="0%">
        <div
          className={`h-full min-h-0 ${
            mobileActivePane === "results" ? "flex flex-col flex-1" : "hidden"
          } ${layout === "focus" && !drawerOpen ? "xl:hidden" : "xl:flex xl:flex-col"
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
        </Panel>
        </Group>
      </div>
      {layout === "focus" && problemSlideOpen && (
        <div className="fixed inset-0 z-40 flex bg-black/60" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setProblemSlideOpen(false);
        }}>
          <section role="dialog" aria-modal="true" aria-label="Problem statement" className="flex h-full w-full max-w-md flex-col bg-[var(--color-surface)] p-3">
            <button type="button" className="mb-2 self-end text-sm underline" onClick={() => setProblemSlideOpen(false)}>Close problem</button>
            <ProblemPane problem={problem} onUseCustomStdin={(sample) => {
              setCustomStdin(sample); setActiveResultsTab("stdin"); setDrawerOpen(true); setProblemSlideOpen(false);
            }} />
          </section>
        </div>
      )}


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
              Reset <strong>{filename}</strong> to starter code, or empty an extra file. Other files stay intact unless you choose Reset all.
            </p>

            <label className="flex items-center gap-2 text-xs text-[var(--color-text-main)]">
              <input type="checkbox" checked={resetAllFiles} onChange={(e) => setResetAllFiles(e.target.checked)} />
              Reset all files and remove companion files
            </label>
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
