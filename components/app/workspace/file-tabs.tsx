"use client";

import { DotIcon } from "@/components/retro/dot-icon";

import { useRef, useState, type KeyboardEvent } from "react";

import type { PreferredLanguage } from "@/types/profile";
import type { WorkspaceFile } from "@/types/draft";

const EXTENSIONS: Record<PreferredLanguage, string[]> = {
  python: [".py"], java: [".java"], cpp: [".cpp", ".hpp", ".h"], c: [".c", ".h"],
};

export function validateWorkspaceFilename(
  name: string,
  lang: PreferredLanguage,
  existing: readonly WorkspaceFile[],
  previousName?: string
): string | null {
  if (!name.trim()) return "Enter a file name.";
  if (name.length > 24 || !/^[A-Za-z0-9_.-]+$/.test(name)) return "Use 1–24 letters, numbers, dots, dashes, or underscores.";
  if (!EXTENSIONS[lang].some((ext) => name.toLowerCase().endsWith(ext))) {
    return `File extension must be ${EXTENSIONS[lang].join(" / ")}.`;
  }
  if (existing.some((file) => file.name.toLowerCase() === name.toLowerCase() && file.name !== previousName)) {
    return "A file with this name already exists.";
  }
  return null;
}

interface FileTabsProps {
  language: PreferredLanguage;
  files: WorkspaceFile[];
  activeName: string;
  mainName: string;
  saveStatus: "SAVED" | "SAVING..." | "MODIFIED";
  onSelect: (name: string) => void;
  onAdd: (name: string) => void;
  onRename: (oldName: string, name: string) => void;
  onClose: (name: string) => void;
}

export function FileTabs({ language, files, activeName, mainName, saveStatus, onSelect, onAdd, onRename, onClose }: FileTabsProps) {
  const [editing, setEditing] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);

  const begin = (name: string | null) => {
    if (name === null && files.length >= 6) { setError("Maximum of six files."); return; }
    setError(null); setEditing(name ?? "new"); setDraftName(name ?? "");
    requestAnimationFrame(() => inputRef.current?.focus());
  };
  const cancel = () => { setEditing(null); setError(null); };
  const save = () => {
    const previous = editing !== "new" ? editing ?? undefined : undefined;
    const check = validateWorkspaceFilename(draftName, language, files, previous);
    if (check) { setError(check); return; }
    if (previous) onRename(previous, draftName);
    else onAdd(draftName);
    cancel();
  };
  const close = (file: WorkspaceFile) => {
    if (file.name === mainName) return;
    if (file.content.trim() && !window.confirm(`Close ${file.name}? Its content will be removed from this workspace.`)) return;
    onClose(file.name);
  };
  const moveTab = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const next = (index + (event.key === "ArrowRight" ? 1 : -1) + files.length) % files.length;
    onSelect(files[next].name);
    tabsRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
  };

  return (
    <div className="relative flex min-w-0 flex-1 items-center gap-1 overflow-visible">
      <div ref={tabsRef} role="tablist" aria-label="Source files" className="flex min-w-0 items-center gap-0.5 overflow-x-auto whitespace-nowrap">
        {files.map((file, index) => (
          <div key={file.name} className={`group inline-flex h-8 shrink-0 items-center border-b-2 ${activeName === file.name ? "border-[var(--color-accent)] bg-[var(--color-elevated)]" : "border-transparent"}`}>
            {editing === file.name ? (
              <input
                ref={inputRef}
                className="h-7 w-28 border border-[var(--color-accent)] bg-[var(--color-canvas)] px-1.5 text-xs"
                value={draftName}
                aria-label="Rename file"
                onChange={(e) => { setDraftName(e.target.value); setError(null); }}
                onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel(); }}
                onBlur={cancel}
              />
            ) : (
              <button
                type="button"
                role="tab"
                id={`filetab-${index}`}
                aria-selected={activeName === file.name}
                tabIndex={activeName === file.name ? 0 : -1}
                title={file.name}
                onClick={() => onSelect(file.name)}
                onDoubleClick={() => { if (file.name !== mainName) begin(file.name); }}
                onAuxClick={(e) => { if (e.button === 1) close(file); }}
                onKeyDown={(e) => moveTab(e, index)}
                className="inline-flex h-8 items-center gap-1.5 px-2 text-xs"
              >
                <DotIcon name="file" size={14} aria-hidden="true" />
                <span>{file.name}</span>
                {activeName === file.name && <span aria-label={saveStatus} title={saveStatus} className={`h-1.5 w-1.5 rounded-full ${saveStatus === "SAVED" ? "bg-[var(--color-mint)]" : "bg-[var(--color-pink)]"}`} />}
              </button>
            )}
            {file.name !== mainName && editing !== file.name && (
              <button
                type="button"
                title={`Close ${file.name}`}
                aria-label={`Close ${file.name}`}
                className="mr-1 rounded p-0.5 text-[var(--color-text-muted)] opacity-70 hover:opacity-100 focus-visible:opacity-100 sm:group-hover:opacity-100"
                onClick={() => close(file)}
              ><DotIcon name="close" size={12} aria-hidden="true" /></button>
            )}
          </div>
        ))}
      </div>
      {editing === "new" ? (
        <input
          ref={inputRef}
          value={draftName}
          aria-label="New file name"
          placeholder="new.py"
          className="h-7 w-28 shrink-0 border border-[var(--color-accent)] bg-[var(--color-canvas)] px-1.5 text-xs"
          onChange={(e) => { setDraftName(e.target.value); setError(null); }}
          onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel(); }}
        />
      ) : (
        <button
          type="button" onClick={() => begin(null)} title="Add source file" aria-label="Add source file"
          disabled={files.length >= 6} className="h-8 w-7 shrink-0 text-base hover:bg-[var(--color-elevated)] disabled:opacity-40"
        ><DotIcon name="circlePlus" size={14} aria-hidden="true" /></button>
      )}
      {error && <span role="alert" title={error} className="absolute left-0 top-full z-30 mt-1 max-w-60 border border-[var(--color-pink)] bg-[var(--color-surface)] p-1 text-[10px] text-[var(--color-pink)]">{error}</span>}
    </div>
  );
}
