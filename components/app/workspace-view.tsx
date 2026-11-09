"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Group, Panel, Separator, useGroupRef } from "react-resizable-panels";
import { useProfile } from "@/hooks/use-profile";
import { useChallengeSession } from "@/hooks/use-challenge-session";
import { useWorkspaceFiles } from "@/hooks/use-workspace-files";
import { useJudge } from "@/hooks/use-judge";
import { useDemoMode } from "@/hooks/use-demo-mode";
import { FileCode2, List, Terminal, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CodeEditor } from "./code-editor";
import { ProblemPane } from "./workspace/problem-pane";
import { ResultsPane, type ResultsTab } from "./workspace/results-pane";
import { DemoControls } from "./workspace/demo-controls";
import { WorkspaceToolbar, type WorkspaceLayout } from "./workspace/workspace-toolbar";
import { SandboxOfflineNotice, ChallengeBar } from "./workspace/workspace-notices";
import { ConfirmDialog, SubmissionResultDialog, TimeExpiredDialog } from "./workspace/submission-modals";
import { VerdictBadge } from "./workspace/verdict-badge";
import { getSimulatedAcceptedResult, getSimulatedWrongAnswerResult } from "@/lib/demo/demo-simulation";
import { isRealVerdict } from "@/lib/verdicts";
import { cn } from "@/lib/utils";
import type { ProblemSummary, VisibleProblem } from "@/types/problem";
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
  const challenge = useChallengeSession();

  const [problem, setProblem] = useState<VisibleProblem | null>(null);
  const [problemIds, setProblemIds] = useState<string[]>([]);
  const [sandboxHealth, setSandboxHealth] = useState<SandboxHealth | null>(null);
  const [offlineDismissed, setOfflineDismissed] = useState(false);

  const files = useWorkspaceFiles(profile, problem, problemIdParam);
  const judge = useJudge();
  const demo = useDemoMode(searchParams.get("demo"));

  const [customStdin, setCustomStdin] = useState("");
  const [activeResultsTab, setActiveResultsTab] = useState<ResultsTab>("console");
  const [mobileActivePane, setMobileActivePane] = useState<MobileActivePane>("code");

  // Layout modes let students expand or restore the editor; saved per browser.
  const [layout, setLayout] = useState<"split" | "wide" | "focus">(problemIdParam ? "split" : "wide");
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
  const [expiredDismissed, setExpiredDismissed] = useState(false);

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
    fetch("/api/health")
      .then((res) => res.ok ? res.json() : null)
      .then((data) => { if (current && data?.sandbox) setSandboxHealth(data.sandbox); })
      .catch(() => { if (current) setSandboxHealth({ isAvailable: false, engine: "Exeku judge (unreachable)", supportedLanguages: [] }); });
    fetch("/api/problems")
      .then((res) => { if (!res.ok) throw new Error("Catalog unavailable"); return res.json(); })
      .then((data: { problems?: ProblemSummary[] }) => { if (current) setProblemIds((data.problems ?? []).map((entry) => entry.id)); })
      .catch(() => { if (current) setProblemIds([]); });
    return () => { current = false; };
  }, []);

  useEffect(() => {
    let current = true;
    if (!problemIdParam) { queueMicrotask(() => { if (current) setProblem(null); }); return () => { current = false; }; }
    fetch(`/api/problems/${encodeURIComponent(problemIdParam)}`)
      .then((res) => res.ok ? res.json() as Promise<VisibleProblem> : null)
      .then((data) => { if (current) setProblem(data); })
      .catch(() => { if (current) setProblem(null); });
    return () => { current = false; };
  }, [problemIdParam]);

  const showResults = (tab: ResultsTab) => {
    setDrawerOpen(true);
    setActiveResultsTab(tab);
    setMobileActivePane("results");
  };

  const source = () => ({ language: files.activeLang, sourceCode: files.mainCode, files: files.files });

  const handleRun = () => {
    if (judge.isRunning || judge.isSubmitting) return;
    showResults("console");
    void judge.run({ ...source(), stdin: customStdin, timeLimitMs: problem?.timeLimitMs ?? 3000 });
  };

  const handleOpenSubmit = () => {
    if (problem && !judge.isRunning && !judge.isSubmitting) setConfirmSubmitOpen(true);
  };

  const handleConfirmSubmission = async () => {
    if (!problem) return;
    setConfirmSubmitOpen(false);
    showResults("results");
    const result = await judge.submit(problem.id, source());
    // Only real verdicts count; a sandbox outage or judge error is not the student's attempt.
    if (challenge.isTimedActive && isRealVerdict(result.overallVerdict)) challenge.recordSubmissionAttempt(result.overallVerdict);
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
    void files.switchLanguage("python");
    files.setActiveFile("main.py");
    files.setFileContent("main.py", code);
    demo.setDemoState(state);
  };

  const previewDemo = (result: ReturnType<typeof getSimulatedAcceptedResult>) => {
    judge.showDemoResult(result);
    showResults("results");
    setResultOpen(true);
  };

  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key !== "Enter") return;
      event.preventDefault();
      if (event.shiftKey) handleOpenSubmit();
      else handleRun();
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  });

  const nextProblemId = useMemo(() => {
    if (!problem) return null;
    const index = problemIds.indexOf(problem.id);
    if (index >= 0 && index < problemIds.length - 1) return problemIds[index + 1];
    return problemIds[0] !== problem.id ? (problemIds[0] ?? null) : null;
  }, [problem, problemIds]);

  const problemPane = (onSample: (input: string) => void) => <ProblemPane problem={problem} onUseCustomStdin={onSample} />;

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
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={mobileActivePane === tab.id}
            onClick={() => setMobileActivePane(tab.id)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium",
              mobileActivePane === tab.id ? "bg-[var(--color-elevated)] text-[var(--color-text-main)]" : "text-[var(--color-text-muted)]",
            )}
          >
            <tab.icon size={13} aria-hidden="true" />{tab.label}
            {tab.id === "code" && files.saveStatus !== "SAVED" && <span className="size-1.5 rounded-full bg-[var(--color-text-main)]" aria-label="Unsaved" />}
            {tab.id === "results" && judge.judgingResult && <VerdictBadge status={judge.judgingResult.overallVerdict} short className="py-0" />}
          </button>
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
                <button
                  type="button"
                  className="hidden h-full w-10 items-center justify-center rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] xl:flex"
                  aria-label="Expand problem pane"
                  onClick={() => setLayout("split")}
                ><span className="[writing-mode:vertical-rl]">Problem ›</span></button>
              ) : problemPane((sample) => { setCustomStdin(sample); showResults("stdin"); })}
            </div>
          </Panel>
          <Separator className="workspace-resize-handle" />

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
                onLanguageChange={(lang) => void files.switchLanguage(lang)}
                isDemoMode={demo.isDemoMode}
                onToggleDemo={() => demo.setDemoMode(!demo.isDemoMode)}
                onReset={() => setResetOpen(true)}
                onDownload={handleDownload}
                layout={layout}
                onCycleLayout={() => setLayout((current: WorkspaceLayout) => current === "split" ? "wide" : current === "wide" ? "focus" : "split")}
                drawerOpen={drawerOpen}
                onToggleDrawer={() => setDrawerOpen((open) => !open)}
                onOpenProblem={() => setProblemSlideOpen(true)}
                canSubmit={Boolean(problem)}
                isRunning={judge.isRunning}
                isSubmitting={judge.isSubmitting}
                onRun={handleRun}
                onSubmit={handleOpenSubmit}
              />
              <div className="relative flex-1 min-h-0 overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)]">
                <CodeEditor
                  key={`${problem?.id ?? "free"}/${files.activeLang}/${files.activeFile}`}
                  filename={files.activeFile}
                  value={files.code}
                  onChange={handleCodeChange}
                />
              </div>
            </div>
          </Panel>
          <Separator className="workspace-resize-handle" />

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
                onCustomStdinChange={setCustomStdin}
                filename={files.activeFile}
                isResultDemo={judge.isResultDemo}
                demoNote={demo.demoNote}
              />
            </div>
          </Panel>
        </Group>
      </div>

      {layout === "focus" && problemSlideOpen && (
        <div className="fixed inset-0 z-40 flex bg-black/40" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setProblemSlideOpen(false); }}>
          <section role="dialog" aria-modal="true" aria-label="Problem statement" className="flex h-full w-full max-w-md flex-col gap-2 bg-[var(--color-canvas)] p-3">
            <Button type="button" variant="ghost" size="sm" className="self-end" onClick={() => setProblemSlideOpen(false)}>Close</Button>
            {problemPane((sample) => { setCustomStdin(sample); showResults("stdin"); setProblemSlideOpen(false); })}
          </section>
        </div>
      )}

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
          nextProblemId={nextProblemId}
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
        open={challenge.status === "expired" && !expiredDismissed}
        onOpenChange={(open) => { if (!open) setExpiredDismissed(true); }}
        submissionCount={challenge.session?.submissionCount ?? 0}
        lastVerdict={challenge.session?.lastVerdict}
      />
    </div>
  );
}
