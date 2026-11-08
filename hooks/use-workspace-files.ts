"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { draftRepository } from "@/lib/storage/draft-repository";
import { recordCodingDay } from "@/lib/storage/coding-activity";
import { getFilenameForLanguage, getStarterCode } from "@/lib/workspace-defaults";
import type { WorkspaceFile } from "@/types/draft";
import type { PreferredLanguage, LocalProfile } from "@/types/profile";
import type { VisibleProblem } from "@/types/problem";

export type SaveStatus = "SAVED" | "SAVING..." | "MODIFIED";

/** Source files for the active problem and language, autosaved to IndexedDB. */
export function useWorkspaceFiles(profile: LocalProfile | null, problem: VisibleProblem | null, problemId: string | null) {
  const profileId = profile?.id;
  const [userSelectedLang, setUserSelectedLang] = useState<PreferredLanguage | null>(null);
  const activeLang = userSelectedLang ?? profile?.preferredLanguage ?? "python";
  const mainFilename = getFilenameForLanguage(activeLang);

  const [files, setFiles] = useState<WorkspaceFile[]>([{ name: "main.py", content: getStarterCode("python") }]);
  const filesRef = useRef(files);
  const [activeFile, setActiveFile] = useState(mainFilename);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("SAVED");
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingSaveRef = useRef<(() => Promise<void>) | null>(null);

  const code = files.find((file) => file.name === activeFile)?.content ?? "";
  const mainCode = files.find((file) => file.name === mainFilename)?.content ?? "";
  const starter = problem?.starterCodes[activeLang] || getStarterCode(activeLang);

  const updateFiles = useCallback((next: WorkspaceFile[]) => { filesRef.current = next; setFiles(next); }, []);

  // Load the profile's existing single-file or multi-file draft.
  useEffect(() => {
    if (!profileId) return;
    let current = true;
    const loaded = (draftFiles: WorkspaceFile[]) => {
      if (!current) return;
      const primary = draftFiles.find((file) => file.name === mainFilename);
      updateFiles([{ name: mainFilename, content: primary?.content ?? starter }, ...draftFiles.filter((file) => file.name !== mainFilename)]);
      setActiveFile(mainFilename);
      setSaveStatus("SAVED");
    };
    draftRepository.getDraft(profileId, activeLang, problemId)
      .then((draft) => loaded(draft?.files?.length ? draft.files : [{ name: mainFilename, content: draft?.code?.trim() ? draft.code : starter }]))
      .catch(() => loaded([{ name: mainFilename, content: starter }]));
    return () => { current = false; };
  }, [profileId, activeLang, mainFilename, starter, problemId, updateFiles]);

  const cancelPendingSave = useCallback(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    pendingSaveRef.current = null;
  }, []);

  // Typing waits 600 ms before saving, so leaving the editor or the page must save right away.
  useEffect(() => {
    const flush = () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      void pendingSaveRef.current?.();
    };
    const flushWhenHidden = () => { if (document.visibilityState === "hidden") flush(); };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", flushWhenHidden);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", flushWhenHidden);
      flush();
    };
  }, []);

  const saveNow = useCallback((next: WorkspaceFile[]) => {
    if (!profileId) return Promise.resolve();
    return draftRepository.saveDraft(profileId, activeLang, next[0]?.content ?? "", next, problemId);
  }, [profileId, activeLang, problemId]);

  const persistFiles = useCallback((next: WorkspaceFile[]) => {
    updateFiles(next);
    setSaveStatus("MODIFIED");
    cancelPendingSave();
    const save = async () => {
      pendingSaveRef.current = null;
      if (!profileId) return;
      setSaveStatus("SAVING...");
      try {
        await saveNow(next);
        recordCodingDay(profileId);
        setSaveStatus("SAVED");
      } catch {
        setSaveStatus("MODIFIED");
      }
    };
    pendingSaveRef.current = save;
    saveTimeoutRef.current = setTimeout(save, 600);
  }, [profileId, saveNow, updateFiles, cancelPendingSave]);

  const setFileContent = useCallback((name: string, content: string) => {
    persistFiles(filesRef.current.map((file) => file.name === name ? { ...file, content } : file));
  }, [persistFiles]);

  const switchLanguage = async (next: PreferredLanguage) => {
    if (next === activeLang) return;
    cancelPendingSave();
    if (saveStatus !== "SAVED") await saveNow(filesRef.current).catch(() => undefined);
    setUserSelectedLang(next);
  };

  /** Reset the active file to starter code (or empty for extra files), or every file. */
  const reset = async (all: boolean) => {
    cancelPendingSave();
    const next = all
      ? [{ name: mainFilename, content: starter }]
      : filesRef.current.map((file) => file.name === activeFile ? { ...file, content: file.name === mainFilename ? starter : "" } : file);
    await saveNow(next);
    updateFiles(next);
    if (all) setActiveFile(mainFilename);
    setSaveStatus("SAVED");
  };

  return {
    activeLang, mainFilename, files, activeFile, setActiveFile, code, mainCode, saveStatus, starter,
    setFileContent, switchLanguage, reset,
    addFile: (name: string) => { persistFiles([...filesRef.current, { name, content: "" }]); setActiveFile(name); },
    renameFile: (previous: string, name: string) => { persistFiles(filesRef.current.map((file) => file.name === previous ? { ...file, name } : file)); setActiveFile(name); },
    closeFile: (name: string) => { persistFiles(filesRef.current.filter((file) => file.name !== name)); if (activeFile === name) setActiveFile(mainFilename); },
  };
}
