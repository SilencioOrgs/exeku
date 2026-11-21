"use client";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { CheckCircle2, CirclePlay, Columns3, Download, FileCode2, RotateCcw, Terminal } from "lucide-react";
import { FileTabs } from "./file-tabs";
import { ALL_SUPPORTED_LANGUAGES, LANGUAGE_DISPLAY_NAMES } from "@/lib/workspace-defaults";
import type { PreferredLanguage } from "@/types/profile";
import type { WorkspaceFile } from "@/types/draft";
import type { SaveStatus } from "@/hooks/use-workspace-files";

export type WorkspaceLayout = "split" | "wide" | "focus";

export interface WorkspaceToolbarProps {
  language: PreferredLanguage;
  files: WorkspaceFile[];
  mainName: string;
  activeName: string;
  saveStatus: SaveStatus;
  onSelectFile: (name: string) => void;
  onAddFile: (name: string) => void;
  onRenameFile: (previous: string, name: string) => void;
  onCloseFile: (name: string) => void;
  onLanguageChange: (language: PreferredLanguage) => void;
  isDemoMode: boolean;
  onToggleDemo: () => void;
  onReset: () => void;
  onDownload: () => void;
  layout: WorkspaceLayout;
  onCycleLayout: () => void;
  drawerOpen: boolean;
  onToggleDrawer: () => void;
  onOpenProblem: () => void;
  canSubmit: boolean;
  isRunning: boolean;
  isSubmitting: boolean;
  onRun: () => void;
  onSubmit: () => void;
}

export function WorkspaceToolbar(props: WorkspaceToolbarProps) {
  const busy = props.isRunning || props.isSubmitting;
  return (
    <div className="workspace-toolbar @container relative z-10 flex min-h-10 shrink-0 flex-wrap items-center gap-1 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] px-1.5 py-1 @[380px]:h-10 @[380px]:flex-nowrap @[380px]:py-0">
      <FileTabs
        language={props.language}
        files={props.files}
        mainName={props.mainName}
        activeName={props.activeName}
        saveStatus={props.saveStatus}
        onSelect={props.onSelectFile}
        onAdd={props.onAddFile}
        onRename={props.onRenameFile}
        onClose={props.onCloseFile}
      />
      <Select
        aria-label="Programming language"
        value={props.language}
        onChange={(value) => props.onLanguageChange(value as PreferredLanguage)}
        className="h-8 w-[84px] shrink-0 px-2 text-xs @[560px]:w-[100px]"
      >
        {ALL_SUPPORTED_LANGUAGES.map((lang) => <option key={lang} value={lang}>{LANGUAGE_DISPLAY_NAMES[lang]}</option>)}
      </Select>
      <Button
        type="button" variant={props.isDemoMode ? "secondary" : "ghost"} size="sm"
        aria-pressed={props.isDemoMode} onClick={props.onToggleDemo}
        title="Simulated results without a sandbox"
        className="hidden shrink-0 @[620px]:inline-flex"
      >Demo</Button>
      <span className="mx-0.5 hidden h-5 border-l border-[var(--color-border)] @[560px]:inline" aria-hidden="true" />
      <Button type="button" variant="ghost" size="icon-sm" className="shrink-0" onClick={props.onReset} aria-label="Reset file" title="Reset file">
        <RotateCcw size={14} aria-hidden="true" />
      </Button>
      <Button type="button" variant="ghost" size="icon-sm" className="shrink-0" onClick={props.onDownload} aria-label="Download file" title="Download file">
        <Download size={14} aria-hidden="true" />
      </Button>
      <Button
        type="button" variant="ghost" size="icon-sm" className="hidden shrink-0 xl:inline-flex"
        aria-label={`Cycle editor layout (currently ${props.layout})`} aria-controls="workspace-panes"
        onClick={props.onCycleLayout} title={`Layout: ${props.layout}. Click to switch between split, wide and focus.`}
      >
        <Columns3 size={14} aria-hidden="true" />
      </Button>
      {props.layout === "focus" && (
        <>
          <Button type="button" variant="outline" size="sm" className="hidden shrink-0 xl:inline-flex" onClick={props.onToggleDrawer} aria-expanded={props.drawerOpen} title="Toggle output pane" aria-label="Toggle output pane">
            <Terminal size={13} aria-hidden="true" /><span className="hidden @[540px]:inline">Output</span>
          </Button>
          <Button type="button" variant="outline" size="sm" className="hidden shrink-0 xl:inline-flex" onClick={props.onOpenProblem} title="Open problem statement" aria-label="Open problem statement">
            <FileCode2 size={13} aria-hidden="true" /><span className="hidden @[540px]:inline">Problem</span>
          </Button>
        </>
      )}
      <span className="mx-0.5 hidden h-5 border-l border-[var(--color-border)] @[520px]:inline" aria-hidden="true" />
      <Button type="button" variant="outline" size="sm" className="shrink-0" disabled={busy} onClick={props.onRun} title="Run (Ctrl/Cmd+Enter)" aria-label="Run code">
        <CirclePlay size={14} aria-hidden="true" /><span className="hidden @[500px]:inline">{props.isRunning ? "Running…" : "Run"}</span>
      </Button>
      <Button type="button" size="sm" className="shrink-0" disabled={!props.canSubmit || busy} onClick={props.onSubmit} title="Submit (Ctrl/Cmd+Shift+Enter)" aria-label="Submit solution">
        <CheckCircle2 size={14} aria-hidden="true" /><span className="hidden @[500px]:inline">{props.isSubmitting ? "Judging…" : "Submit"}</span>
      </Button>
    </div>
  );
}
