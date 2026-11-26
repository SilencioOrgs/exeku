"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Group, Panel, Separator, useGroupRef } from "react-resizable-panels";
import { useProfile } from "@/hooks/use-profile";
import { useChallengeSession } from "@/hooks/use-challenge-session";
import { useWorkspaceFiles } from "@/hooks/use-workspace-files";
import { useJudge } from "@/hooks/use-judge";
import { useDemoMode } from "@/hooks/use-demo-mode";
import { FileCode2, List, Terminal, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CodeEditor } from "./code-editor";
import { ProblemPane } from "./workspace/problem-pane";
import { ResultsPane, type ConsoleStdinState, type QuickSample, type ResultsTab } from "./workspace/results-pane";
import { DemoControls } from "./workspace/demo-controls";
import { WorkspaceToolbar, type WorkspaceLayout } from "./workspace/workspace-toolbar";
import { SandboxOfflineNotice, ChallengeBar, CodeSafetyNotice } from "./workspace/workspace-notices";
import { ConfirmDialog, SubmissionResultDialog, TimeExpiredDialog } from "./workspace/submission-modals";
import { VerdictBadge } from "./workspace/verdict-badge";
import { getSimulatedAcceptedResult, getSimulatedWrongAnswerResult } from "@/lib/demo/demo-simulation";
import { checkWorkspaceSafety } from "@/lib/execution/code-safety";
import {
  appendInteractiveInput,
  detectStdinUsage,
  extractStdoutDelta,
  isAwaitingStdin,
  MAX_INTERACTIVE_STEPS,
} from "@/lib/execution/stdin-interactive";
import { findLearnChapterById } from "@/lib/learn/curriculum";
import { isRealVerdict } from "@/lib/verdicts";
import { ALL_SUPPORTED_LANGUAGES } from "@/lib/workspace-defaults";
import { call, peekApiCache } from "@/lib/accounts/api";
import { invalidateClientCache } from "@/lib/client/swr-cache";
import { fetchEvents, TOURNAMENT_REFRESH_EVENT } from "@/lib/orgs/api";
import { cn } from "@/lib/utils";
import type { ProblemSummary, VisibleProblem } from "@/types/problem";
import type { PreferredLanguage } from "@/types/profile";
import type { SandboxHealth } from "@/types/execution";

type MobileActivePane = "problem" | "code" | "results";

const MOBILE_TABS: { id: MobileActivePane; label: string; icon: LucideIcon }[] = [
  { id: "problem", label: "Problem", icon: List },
  { id: "code", label: "Code", icon: FileCode2 },
  { id: "results", label: "Output", icon: Terminal },
];

export function WorkspaceView() {
  const { profile } = useProfile();
  const searchParams = useSearchParams();
  const problemIdParam = searchParams.get("problem");
  const lessonParam = searchParams.get("lesson");
  const rawLangParam = searchParams.get("lang");
  const langParam: PreferredLanguage | null =
    rawLangParam && ALL_SUPPORTED_LANGUAGES.includes(rawLangParam as PreferredLanguage)
      ? (rawLangParam as PreferredLanguage)
      : null;
  const lessonChapter = useMemo(() => findLearnChapterById(lessonParam), [lessonParam]);
  const challenge = useChallengeSession();

  const [fetchedProblem, setProblem] = useState<VisibleProblem | null>(null);
  const problem = fetchedProblem && fetchedProblem.id === problemIdParam ? fetchedProblem : null;
  const [problemIds, setProblemIds] = useState<string[]>([]);
  const [sandboxHealth, setSandboxHealth] = useState<SandboxHealth | null>(null);
  const [offlineDismissed, setOfflineDismissed] = useState(false);

  const draftScope = problemIdParam ?? (lessonChapter ? `lesson:${lessonChapter.id}` : null);
  const lessonStarters = useMemo(
    () =>
      lessonChapter && !problemIdParam
        ? {
            python: lessonChapter.lessons.python.exampleCode,
            java: lessonChapter.lessons.java.exampleCode,
            cpp: lessonChapter.lessons.cpp.exampleCode,
            c: lessonChapter.lessons.c.exampleCode,
          }
        : null,
    [lessonChapter, problemIdParam],
  );
  const files = useWorkspaceFiles(profile, problem, draftScope, lessonStarters, langParam);
  const judge = useJudge();
  const demo = useDemoMode(searchParams.get("demo"));

  const [customStdin, setCustomStdin] = useState("");
  const [stdinState, setStdinState] = useState<ConsoleStdinState>({ phase: "idle" });
  const [lastAdHocStdin, setLastAdHocStdin] = useState("");
  const [activeResultsTab, setActiveResultsTab] = useState<ResultsTab>("console");
  const [mobileActivePane, setMobileActivePane] = useState<MobileActivePane>("code");

  // Layout modes let students expand or restore the editor; saved per browser.
  const [layout, setLayout] = useState<"split" | "wide" | "focus">(problemIdParam || lessonChapter ? "split" : "wide");
  const [layoutReady, setLayoutReady] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [problemSlideOpen, setProblemSlideOpen] = useState(false);
  const resizeGroupRef = useGroupRef();
  const [splitSizes, setSplitSizes] = useState({ problem: 28, editor: 48, results: 24 });

  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetAllFiles, setResetAllFiles] = useState(false);
  const [forfeitOpen, setForfeitOpen] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  const [dismissedExpiredId, setDismissedExpiredId] = useState<string | null>(null);

  // This view stays mounted between problems, so verdict, console output, and stdin must be cleared when the problem changes.
  const prevProblemRef = useRef(draftScope);
  const judgeResetRef = useRef(judge.reset);
  useEffect(() => {
    judgeResetRef.current = judge.reset;
  });
  useEffect(() => {
    if (prevProblemRef.current === draftScope) return;
    prevProblemRef.current = draftScope;
    queueMicrotask(() => {
      setResultOpen(false);
      setConfirmSubmitOpen(false);
      setCustomStdin("");
      setStdinState({ phase: "idle" });
      setLastAdHocStdin("");
      setActiveResultsTab("console");
      judgeResetRef.current();
    });
  }, [draftScope]);

  const eventId = searchParams.get("event");
  const [eventRun, setEventRun] = useState<{ title: string; problemIds: string[]; solved: string[] } | null>(null);
  useEffect(() => {
    let current = true;
    if (!eventId) { queueMicrotask(() => { if (current) setEventRun(null); }); return () => { current = false; }; }
    void fetchEvents().then((result) => {
      if (!current || !result.ok) return;
      const event = result.data.events.find((e) => e.id === eventId);
      const problemIds = event?.problems?.map((p) => p.id) ?? [];
      setEventRun(event && problemIds.length > 0 ? { title: event.title, problemIds, solved: (event?.solvedProblemIds ?? result.data.solvedProblemIds).filter((id) => problemIds.includes(id)) } : null);
    });
    return () => { current = false; };
  }, [eventId]);

  useEffect(() => {
    queueMicrotask(() => {
      try {
        setOfflineDismissed(sessionStorage.getItem("exeku.workspace.sandbox-dismissed") === "1");
        const stored = localStorage.getItem("exeku.workspace.layout");
        if (stored === "split" || stored === "wide" || stored === "focus") setLayout(stored);
        const widths = JSON.parse(localStorage.getItem("exeku.workspace.panes") || "null");
        if (widths && typeof widths.problem === "number" && typeof widths.editor === "number" && typeof widths.results === "number"
            && widths.problem >= 20 && widths.editor >= 35 && widths.results >= 18
            && Math.abs(widths.problem + widths.editor + widths.results - 100) < 1) {
          setSplitSizes(widths);
        }
      } catch { /* local preference storage may be unavailable */ }
      setLayoutReady(true);
    });
  }, []);

  useEffect(() => {
    // Do not overwrite an existing saved layout with the initial split default.
    if (!layoutReady) return;
    try { localStorage.setItem("exeku.workspace.layout", layout); } catch { /* local-only preference */ }
    const widths = layout === "split" ? splitSizes :
      layout === "wide" ? { problem: 4, editor: 72, results: 24 } :
      { problem: 0, editor: drawerOpen ? 65 : 100, results: drawerOpen ? 35 : 0 };
    const frame = requestAnimationFrame(() => resizeGroupRef.current?.setLayout(widths));
    return () => cancelAnimationFrame(frame);
  }, [layout, drawerOpen, splitSizes, resizeGroupRef, layoutReady]);

  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      if (problemSlideOpen) { setProblemSlideOpen(false); return; }
      // Escape inside the editor is the "leave editor" key, not a layout change.
      if (layout === "focus" && !(event.target instanceof Element && event.target.closest(".code-editor"))) setLayout("split");
    };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [layout, problemSlideOpen]);

  useEffect(() => {
    let current = true;
    const checkHealth = () =>
      fetch("/api/health")
        .then((res) => res.ok ? res.json() : null)
        .then((data) => { if (current && data?.sandbox) setSandboxHealth(data.sandbox); })
        .catch(() => { if (current) setSandboxHealth({ isAvailable: false, engine: "Exeku judge (unreachable)", supportedLanguages: [] }); });
    void checkHealth();
    const cachedProblems = peekApiCache<{ problems?: ProblemSummary[] }>("/api/problems");
    if (cachedProblems?.problems) {
      queueMicrotask(() => { if (current) setProblemIds(cachedProblems.problems!.map((entry) => entry.id)); });
    }
    void call<{ problems?: ProblemSummary[] }>("/api/problems").then((res) => {
      if (!current) return;
      if (res.ok) setProblemIds((res.data.problems ?? []).map((entry) => entry.id));
      else if (!cachedProblems) setProblemIds([]);
    });
    const onFocus = () => {
      if (!document.hidden) void checkHealth();
    };
    window.addEventListener("focus", onFocus);
    return () => {
      current = false;
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  useEffect(() => {
    let current = true;
    if (!problemIdParam) { queueMicrotask(() => { if (current) setProblem(null); }); return () => { current = false; }; }
    const path = `/api/problems/${encodeURIComponent(problemIdParam)}`;
    const cached = peekApiCache<VisibleProblem>(path);
    if (cached) {
      queueMicrotask(() => { if (current) setProblem(cached); });
    }
    void call<VisibleProblem>(path).then((res) => {
      if (!current) return;
      if (res.ok) setProblem(res.data);
      else if (!cached) setProblem(null);
    });
    return () => { current = false; };
  }, [problemIdParam]);

  const showResults = (tab: ResultsTab) => {
    setDrawerOpen(true);
    setActiveResultsTab(tab);
    setMobileActivePane("results");
  };

  const safetyCheck = useMemo(
    () => checkWorkspaceSafety(files.activeLang, files.files),
    [files.activeLang, files.files],
  );
  const safetyBlockedReason = safetyCheck.safe ? undefined : safetyCheck.message;

  const source = () => ({ language: files.activeLang, sourceCode: files.mainCode, files: files.files });
  const runTimeLimitMs = problem?.timeLimitMs ?? 3000;

  const quickSamples = useMemo<QuickSample[]>(() => {
    if (problem?.sampleTestCases.length) {
      return problem.sampleTestCases.map((sample, idx) => ({
        label: `Sample ${idx + 1}`,
        input: sample.input,
      }));
    }
    const lessonSample = lessonChapter?.lessons[files.activeLang]?.exampleStdin;
    if (lessonSample) {
      return [{ label: "Lesson sample", input: lessonSample }];
    }
    return [];
  }, [problem, lessonChapter, files.activeLang]);

  const runWithStdin = async (stdin: string, kind: "direct" | "prompt") => {
    const lang = files.activeLang;
    const result = await judge.run({ ...source(), stdin, timeLimitMs: runTimeLimitMs });
    if (!result) return;
    if (isAwaitingStdin(lang, result)) {
      const normalized = stdin.length > 0 ? (stdin.endsWith("\n") ? stdin : `${stdin}\n`) : "";
      setStdinState({
        phase: "interactive",
        entries: [],
        pendingPrompt: result.stdout,
        rawStdout: result.stdout,
        stdinSoFar: normalized,
        lineDraft: "",
        steps: 0,
        lastResult: result,
        continuedFromSavedInput: kind === "direct" && stdin.length > 0,
      });
      return;
    }
    if (kind === "prompt") {
      setStdinState({
        phase: "done",
        kind: "prompt",
        entries: [],
        trailingOutput: result.stdout,
        stdinUsed: stdin,
        prefixBroken: false,
      });
      return;
    }
    setStdinState({ phase: "idle" });
  };

  const handlePromptRun = (stdin: string) => {
    if (judge.isRunning || judge.isSubmitting || !safetyCheck.safe) return;
    if (stdin.length > 0) setLastAdHocStdin(stdin);
    setStdinState({ phase: "idle" });
    void runWithStdin(stdin, "prompt");
  };

  const handleInteractiveSubmit = async (entry: string) => {
    if (stdinState.phase !== "interactive" || judge.isRunning || judge.isSubmitting || !safetyCheck.safe) return;
    const snapshot = stdinState;
    const lang = files.activeLang;
    const { nextStdin, displayInput } = appendInteractiveInput(snapshot.stdinSoFar, entry);
    const nextEntries = [...snapshot.entries, { prompt: snapshot.pendingPrompt, input: displayInput }];
    setLastAdHocStdin(nextStdin);
    setStdinState({
      ...snapshot,
      entries: nextEntries,
      pendingPrompt: "",
      lineDraft: "",
      stdinSoFar: nextStdin,
    });
    const result = await judge.run({ ...source(), stdin: nextStdin, timeLimitMs: runTimeLimitMs });
    if (!result) return;
    const { delta, prefixMatched } = extractStdoutDelta(snapshot.rawStdout, result.stdout);
    if (isAwaitingStdin(lang, result) && snapshot.steps + 1 < MAX_INTERACTIVE_STEPS) {
      setStdinState({
        phase: "interactive",
        entries: nextEntries,
        pendingPrompt: delta,
        rawStdout: result.stdout,
        stdinSoFar: nextStdin,
        lineDraft: "",
        steps: snapshot.steps + 1,
        lastResult: result,
        continuedFromSavedInput: snapshot.continuedFromSavedInput,
      });
      return;
    }
    setStdinState({
      phase: "done",
      kind: "interactive",
      entries: nextEntries,
      trailingOutput: delta,
      stdinUsed: nextStdin,
      prefixBroken: !prefixMatched,
    });
  };

  const handleInteractiveEndInput = () => {
    if (stdinState.phase !== "interactive") return;
    setStdinState({
      phase: "done",
      kind: "interactive",
      entries: stdinState.entries,
      trailingOutput: stdinState.pendingPrompt,
      stdinUsed: stdinState.stdinSoFar,
      prefixBroken: false,
    });
  };

  const handleInteractiveStop = () => {
    judge.cancelRun();
    setStdinState({ phase: "idle" });
  };

  const handleRunWithSample = (sampleInput: string) => {
    if (judge.isRunning || judge.isSubmitting || !safetyCheck.safe) return;
    setLastAdHocStdin(sampleInput);
    setStdinState({ phase: "idle" });
    void runWithStdin(sampleInput, "prompt");
  };

  const handleRunNewInput = () => {
    if (judge.isRunning || judge.isSubmitting || !safetyCheck.safe) return;
    showResults("console");
    const mode = detectStdinUsage(files.activeLang, files.files);
    if (mode === "interactive") {
      setStdinState({ phase: "idle" });
      void runWithStdin("", "direct");
      return;
    }
    setStdinState({ phase: "prompt", draft: "" });
  };

  const handleRun = () => {
    if (judge.isRunning || judge.isSubmitting || !safetyCheck.safe) return;
    if (stdinState.phase === "prompt") {
      handlePromptRun(stdinState.draft);
      return;
    }
    showResults("console");
    if (customStdin.length > 0) {
      setStdinState({ phase: "idle" });
      void runWithStdin(customStdin, "direct");
      return;
    }
    const mode = detectStdinUsage(files.activeLang, files.files);
    if (mode === "prompt") {
      setStdinState({ phase: "prompt", draft: "" });
      return;
    }
    setStdinState({ phase: "idle" });
    void runWithStdin("", "direct");
  };

  const handleOpenSubmit = () => {
    if (problem && !judge.isRunning && !judge.isSubmitting && safetyCheck.safe) setConfirmSubmitOpen(true);
  };

  const handleConfirmSubmission = async () => {
    if (!problem || judge.isSubmitting || !safetyCheck.safe) return;
    setConfirmSubmitOpen(false);
    setStdinState({ phase: "idle" });
    showResults("results");
    const result = await judge.submit(problem.id, source());
    if (!result) return;
    if (result.overallVerdict === "ACCEPTED") {
      window.dispatchEvent(new Event(TOURNAMENT_REFRESH_EVENT));
      invalidateClientCache(["/api/events", "/api/classes", "/api/account/profile", "/api/notifications"]);
      setEventRun((run) => run && run.problemIds.includes(problem.id) && !run.solved.includes(problem.id) ? { ...run, solved: [...run.solved, problem.id] } : run);
    }
    // Only real verdicts for the active challenge's problem count; sandbox errors or other problems never credit it.
    if (challenge.isTimedActive && challenge.session?.problemId === problem.id && isRealVerdict(result.overallVerdict)) {
      challenge.recordSubmissionAttempt(result.overallVerdict);
    }
    setResultOpen(true);
  };

  const handleCodeChange = (code: string) => {
    files.setFileContent(files.activeFile, code);
    demo.noteCodeChange(code, files.activeFile === files.mainFilename);
  };

  const handleDownload = () => {
    const url = URL.createObjectURL(new Blob([files.code], { type: "text/plain;charset=utf-8" }));
    const link = Object.assign(document.createElement("a"), { href: url, download: files.activeFile });
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleReset = async () => {
    try {
      await files.reset(resetAllFiles);
      demo.setDemoState("idle");
      setResetOpen(false);
      setResetAllFiles(false);
    } catch { /* draft stays marked unsaved; the dialog stays open */ }
  };

  const loadDemoCode = (code: string, state: "solved" | "incorrect") => {
    void files.switchLanguage("python", code);
    demo.setDemoState(state);
  };

  const previewDemo = (result: ReturnType<typeof getSimulatedAcceptedResult>) => {
    judge.showDemoResult(result);
    showResults("results");
    setResultOpen(true);
  };

  const shortcutHandlersRef = useRef({ run: handleRun, submit: handleOpenSubmit });
  useEffect(() => {
    shortcutHandlersRef.current = { run: handleRun, submit: handleOpenSubmit };
  });

  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key !== "Enter") return;
      event.preventDefault();
      if (event.shiftKey) shortcutHandlersRef.current.submit();
      else shortcutHandlersRef.current.run();
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);

  const loadedLessonKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!lessonChapter || problemIdParam) return;
    const key = `${lessonChapter.id}:${files.activeLang}`;
    if (loadedLessonKeyRef.current === key) return;
    loadedLessonKeyRef.current = key;
    const lesson = lessonChapter.lessons[files.activeLang];
    queueMicrotask(() => {
      setLayout("split");
      if (lesson.exampleStdin !== undefined) {
        setCustomStdin(lesson.exampleStdin);
      }
    });
  }, [lessonChapter, problemIdParam, files.activeLang]);

  const activeProblemId = problem?.id ?? problemIdParam;

  const prevProblemId = useMemo(() => {
    if (!activeProblemId) return null;
    const list = eventRun ? eventRun.problemIds : problemIds;
    if (list.length <= 1) return null;
    const index = list.indexOf(activeProblemId);
    if (index > 0) return list[index - 1];
    return list[list.length - 1] !== activeProblemId ? (list[list.length - 1] ?? null) : null;
  }, [activeProblemId, problemIds, eventRun]);

  const nextProblemId = useMemo(() => {
    if (!activeProblemId) return null;
    if (eventRun) {
      const unsolved = eventRun.problemIds.find((id) => id !== activeProblemId && !eventRun.solved.includes(id));
      if (unsolved) return unsolved;
    }
    const list = eventRun ? eventRun.problemIds : problemIds;
    if (list.length <= 1) return null;
    const index = list.indexOf(activeProblemId);
    if (index >= 0 && index < list.length - 1) return list[index + 1];
    return list[0] !== activeProblemId ? (list[0] ?? null) : null;
  }, [activeProblemId, problemIds, eventRun]);

  const eventQuery = eventRun && eventId ? `&event=${encodeURIComponent(eventId)}` : "";
  const prevProblemHref = prevProblemId ? `/app/workspace?problem=${encodeURIComponent(prevProblemId)}${eventQuery}` : null;
  const nextProblemHref = nextProblemId ? `/app/workspace?problem=${encodeURIComponent(nextProblemId)}${eventQuery}` : null;

  const problemPane = (onSample: (input: string) => void) => (
    <ProblemPane
      problem={problem}
      prevHref={prevProblemHref}
      nextHref={nextProblemHref}
      lessonChapter={lessonChapter}
      activeLanguage={files.activeLang}
      onLoadLessonCode={(code, stdin) => {
        void files.switchLanguage(files.activeLang, code);
        if (stdin !== undefined) setCustomStdin(stdin);
      }}
      onUseCustomStdin={onSample}
    />
  );

  return (
    <div className="workspace-view flex min-h-[420px] h-[calc(100dvh-90px)] flex-col gap-2 overflow-hidden">
      {sandboxHealth && !sandboxHealth.isAvailable && !offlineDismissed && !demo.isDemoMode && (
        <SandboxOfflineNotice
          missingLanguages={sandboxHealth.missingLanguages}
          onEnableDemo={() => demo.setDemoMode(true)}
          onDismiss={() => {
            setOfflineDismissed(true);
            try { sessionStorage.setItem("exeku.workspace.sandbox-dismissed", "1"); } catch { /* restricted */ }
          }}
        />
      )}

      {challenge.isTimedActive && (
        <ChallengeBar
          formattedTime={challenge.formattedTime}
          isWarningTime={challenge.isWarningTime}
          submissionCount={challenge.session?.submissionCount ?? 0}
          canFinish={challenge.hasSubmittedAtLeastOnce}
          onFinish={() => setFinishOpen(true)}
          onForfeit={() => setForfeitOpen(true)}
        />
      )}

      {demo.isDemoMode && (
        <DemoControls
          onLoadSolved={() => loadDemoCode(demo.solvedCode, "solved")}
          onLoadIncorrect={() => loadDemoCode(demo.incorrectCode, "incorrect")}
          onResetDemo={() => { files.setFileContent(files.mainFilename, files.starter); demo.setDemoState("idle"); judge.showDemoResult(null); judge.clearRun(); }}
          onPreviewAccepted={() => previewDemo(getSimulatedAcceptedResult())}
          onPreviewWrongAnswer={() => previewDemo(getSimulatedWrongAnswerResult())}
          onExit={() => { demo.setDemoMode(false); if (judge.isResultDemo) judge.showDemoResult(null); }}
        />
      )}

      {/* Pane switcher below desktop widths. */}
      <div role="tablist" aria-label="Workspace panes" className="flex shrink-0 gap-1 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-1 xl:hidden">
        {MOBILE_TABS.map((tab) => (
          <Button
            key={tab.id}
            type="button"
            variant="ghost"
            size="sm"
            role="tab"
            aria-selected={mobileActivePane === tab.id}
            onClick={() => setMobileActivePane(tab.id)}
            className={cn(
              "h-8 flex-1 gap-1.5 rounded-md py-1.5 text-xs font-medium",
              mobileActivePane === tab.id ? "bg-[var(--color-elevated)] text-[var(--color-text-main)]" : "text-[var(--color-text-muted)]",
            )}
          >
            <tab.icon size={13} aria-hidden="true" />{tab.label}
            {tab.id === "code" && files.saveStatus !== "SAVED" && (
              <>
                <span aria-hidden="true" className="size-1.5 rounded-full bg-[var(--color-text-main)]" />
                <span className="sr-only">Unsaved changes</span>
              </>
            )}
            {tab.id === "results" && judge.judgingResult && <VerdictBadge status={judge.judgingResult.overallVerdict} short className="py-0" />}
          </Button>
        ))}
      </div>

      <div id="workspace-panes" className="workspace-panes flex-1 min-h-0 min-w-0" data-layout={layout} data-mobile-pane={mobileActivePane}>
        <Group
          id="exeku-workspace-resizable"
          groupRef={resizeGroupRef}
          orientation={layout === "focus" ? "vertical" : "horizontal"}
          defaultLayout={{ problem: 28, editor: 48, results: 24 }}
          onLayoutChanged={(sizes, meta) => {
            if (layout !== "split" || !meta.isUserInteraction) return;
            if (sizes.problem >= 20 && sizes.editor >= 35 && sizes.results >= 18) {
              const next = { problem: sizes.problem, editor: sizes.editor, results: sizes.results };
              setSplitSizes(next);
              try { localStorage.setItem("exeku.workspace.panes", JSON.stringify(next)); } catch { /* storage restricted */ }
            }
          }}
          className="workspace-resizable-group h-full min-h-0 min-w-0"
        >
          <Panel id="problem" defaultSize="28%" minSize={layout === "split" ? "20%" : "0%"} collapsible={layout !== "split"} collapsedSize="0%">
            <div className={cn("h-full min-h-0", mobileActivePane === "problem" ? "flex flex-1 flex-col" : "hidden", layout === "focus" ? "xl:hidden" : "xl:flex xl:flex-col")}>
              {layout === "wide" ? (
                <>
                  <div className="h-full min-h-0 flex-1 xl:hidden">
                    {problemPane((sample) => { setCustomStdin(sample); showResults("stdin"); })}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="hidden h-full w-10 items-center justify-center rounded-[var(--radius-card)] border-[var(--color-border)] bg-[var(--color-surface)] p-0 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] xl:flex"
                    aria-label="Expand problem pane"
                    onClick={() => setLayout("split")}
                  ><span className="[writing-mode:vertical-rl]">Problem ›</span></Button>
                </>
              ) : problemPane((sample) => { setCustomStdin(sample); showResults("stdin"); })}
            </div>
          </Panel>
          <Separator aria-label="Resize problem and editor panes" className="workspace-resize-handle" />

          <Panel id="editor" defaultSize="48%" minSize={layout === "focus" ? "30%" : "35%"}>
            <div className={cn("h-full min-h-0 flex-col gap-2", mobileActivePane === "code" ? "flex flex-1" : "hidden xl:flex")}>
              <WorkspaceToolbar
                language={files.activeLang}
                files={files.files}
                mainName={files.mainFilename}
                activeName={files.activeFile}
                saveStatus={files.saveStatus}
                onSelectFile={files.setActiveFile}
                onAddFile={files.addFile}
                onRenameFile={files.renameFile}
                onCloseFile={files.closeFile}
                onLanguageChange={(lang) => {
                  judge.cancelRun();
                  setStdinState({ phase: "idle" });
                  setLastAdHocStdin("");
                  void files.switchLanguage(lang);
                }}
                isDemoMode={demo.isDemoMode}
                onToggleDemo={() => demo.setDemoMode(!demo.isDemoMode)}
                onReset={() => setResetOpen(true)}
                onDownload={handleDownload}
                layout={layout}
                onCycleLayout={() => {
                  setProblemSlideOpen(false);
                  setLayout((current: WorkspaceLayout) => current === "split" ? "wide" : current === "wide" ? "focus" : "split");
                }}
                drawerOpen={drawerOpen}
                onToggleDrawer={() => setDrawerOpen((open) => !open)}
                onOpenProblem={() => setProblemSlideOpen(true)}
                canSubmit={Boolean(problem)}
                blockedReason={safetyBlockedReason}
                isRunning={judge.isRunning}
                isSubmitting={judge.isSubmitting}
                onRun={handleRun}
                onSubmit={handleOpenSubmit}
              />
              {!safetyCheck.safe && (
                <CodeSafetyNotice
                  label={safetyCheck.issue.label}
                  reason={safetyCheck.issue.reason}
                  fileName={safetyCheck.issue.fileName}
                />
              )}
              <div className="relative flex-1 min-h-0 overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] transition-colors focus-within:border-[var(--color-ring)]">
                <CodeEditor
                  key={`${draftScope ?? "free"}/${files.activeLang}/${files.activeFile}`}
                  filename={files.activeFile}
                  value={files.code}
                  onChange={handleCodeChange}
                />
              </div>
            </div>
          </Panel>
          <Separator aria-label="Resize editor and output panes" className="workspace-resize-handle" />

          <Panel id="results" defaultSize="24%" minSize={layout === "focus" ? "0%" : "18%"} collapsible={layout === "focus"} collapsedSize="0%">
            <div className={cn("h-full min-h-0", mobileActivePane === "results" ? "flex flex-1 flex-col" : "hidden", layout === "focus" && !drawerOpen ? "xl:hidden" : "xl:flex xl:flex-col")}>
              <ResultsPane
                activeTab={activeResultsTab}
                onTabChange={setActiveResultsTab}
                isRunning={judge.isRunning}
                isSubmitting={judge.isSubmitting}
                executionResult={judge.executionResult}
                judgingResult={judge.judgingResult}
                customStdin={customStdin}
                onCustomStdinChange={(value) => {
                  setCustomStdin(value);
                  if (stdinState.phase === "prompt") setStdinState({ phase: "idle" });
                }}
                filename={files.activeFile}
                isResultDemo={judge.isResultDemo}
                demoNote={demo.demoNote}
                stdinState={stdinState}
                quickSamples={quickSamples}
                lastAdHocStdin={lastAdHocStdin}
                onPromptDraftChange={(draft) => setStdinState((cur) => cur.phase === "prompt" ? { ...cur, draft } : cur)}
                onPromptRun={handlePromptRun}
                onPromptCancel={() => setStdinState({ phase: "idle" })}
                onInteractiveLineChange={(lineDraft) => setStdinState((cur) => cur.phase === "interactive" ? { ...cur, lineDraft } : cur)}
                onInteractiveSubmit={(entry) => void handleInteractiveSubmit(entry)}
                onInteractiveEndInput={handleInteractiveEndInput}
                onInteractiveStop={handleInteractiveStop}
                onRunWithSample={handleRunWithSample}
                onSaveStdinToTab={(stdin) => {
                  setCustomStdin(stdin);
                  showResults("stdin");
                }}
                onRunNewInput={handleRunNewInput}
              />
            </div>
          </Panel>
        </Group>
      </div>

      <Sheet open={layout === "focus" && problemSlideOpen} onOpenChange={setProblemSlideOpen}>
        <SheetContent side="left" className="flex w-full max-w-md flex-col gap-2 bg-[var(--color-canvas)] p-3 sm:max-w-md">
          <SheetHeader className="sr-only">
            <SheetTitle>Problem statement</SheetTitle>
          </SheetHeader>
          <div className="min-h-0 flex-1 pt-8">
            {problemPane((sample) => { setCustomStdin(sample); showResults("stdin"); setProblemSlideOpen(false); })}
          </div>
        </SheetContent>
      </Sheet>

      {problem && (
        <ConfirmDialog
          open={confirmSubmitOpen}
          onOpenChange={setConfirmSubmitOpen}
          title="Submit your solution?"
          description={<>Your code runs against {problem.visibleTestCases.length} visible and all hidden tests for {problem.title}.</>}
          confirmLabel="Submit"
          onConfirm={() => void handleConfirmSubmission()}
        >
          {challenge.isTimedActive && <p className="font-code text-xs text-[var(--color-text-muted)]">{challenge.formattedTime} left in this challenge.</p>}
        </ConfirmDialog>
      )}

      {problem && (
        <SubmissionResultDialog
          open={resultOpen}
          onOpenChange={setResultOpen}
          result={judge.judgingResult}
          problemTitle={problem.title}
          isDemo={judge.isResultDemo}
          onViewDetails={() => showResults("results")}
          nextHref={nextProblemId ? `/app/workspace?problem=${encodeURIComponent(nextProblemId)}${eventRun ? `&event=${encodeURIComponent(eventId ?? "")}` : ""}` : null}
          eventProgress={eventRun ? { title: eventRun.title, solved: eventRun.solved.length, total: eventRun.problemIds.length } : null}
        />
      )}

      <ConfirmDialog
        open={resetOpen}
        onOpenChange={(open) => { setResetOpen(open); if (!open) setResetAllFiles(false); }}
        title={`Reset ${files.activeFile}?`}
        description={files.activeFile === files.mainFilename ? "It goes back to the starter code. Other files stay as they are." : "This file is emptied. Other files stay as they are."}
        confirmLabel="Reset"
        onConfirm={() => void handleReset()}
      >
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={resetAllFiles} onChange={(e) => setResetAllFiles(e.target.checked)} />
          Reset all files and remove extra files
        </label>
      </ConfirmDialog>

      <ConfirmDialog
        open={forfeitOpen}
        onOpenChange={setForfeitOpen}
        title="Forfeit this challenge?"
        description={<>The timer stops and the challenge is marked as forfeited. Your code stays saved. <span className="font-code">{challenge.formattedTime}</span> left.</>}
        confirmLabel="Forfeit"
        cancelLabel="Keep going"
        destructive
        onConfirm={() => { challenge.forfeitChallenge(); setForfeitOpen(false); }}
      />

      <ConfirmDialog
        open={finishOpen}
        onOpenChange={setFinishOpen}
        title="Finish this challenge?"
        description={`You made ${challenge.session?.submissionCount ?? 0} submission(s). Finishing stops the timer.`}
        confirmLabel="Finish"
        cancelLabel="Keep going"
        onConfirm={() => { challenge.finishChallenge(); setFinishOpen(false); }}
      />

      <TimeExpiredDialog
        open={challenge.status === "expired" && dismissedExpiredId !== (challenge.session?.id ?? null)}
        onOpenChange={(open) => { if (!open) setDismissedExpiredId(challenge.session?.id ?? null); }}
        submissionCount={challenge.session?.submissionCount ?? 0}
        lastVerdict={challenge.session?.lastVerdict}
      />
    </div>
  );
}
