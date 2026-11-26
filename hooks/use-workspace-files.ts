"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { draftRepository } from "@/lib/storage/draft-repository";
import { recordCodingDay } from "@/lib/storage/coding-activity";
import { getFilenameForLanguage, getStarterCode } from "@/lib/workspace-defaults";
import type { WorkspaceFile } from "@/types/draft";
import type { PreferredLanguage, LocalProfile } from "@/types/profile";
import type { SavedSolution, VisibleProblem } from "@/types/problem";

export type SaveStatus = "SAVED" | "SAVING..." | "MODIFIED";

function normalizeFilesForLanguage(language: PreferredLanguage, nextFiles: WorkspaceFile[], fallbackContent: string): WorkspaceFile[] {
  const mainName = getFilenameForLanguage(language);
  const primary = nextFiles.find((file) => file.name === mainName);
  return [
    { name: mainName, content: primary?.content ?? fallbackContent },
    ...nextFiles.filter((file) => file.name !== mainName),
  ];
}

function resolveSolutionFiles(solution: SavedSolution): WorkspaceFile[] {
  if (solution.files?.length) {
    return normalizeFilesForLanguage(solution.language, solution.files, solution.sourceCode ?? "");
  }
  return [{ name: getFilenameForLanguage(solution.language), content: solution.sourceCode ?? "" }];
}

function isSolutionNewerThanDraft(draftUpdatedAt: string | null, solvedAt: string): boolean {
  if (!draftUpdatedAt) return true;
  const draftMs = Date.parse(draftUpdatedAt);
  const solvedMs = Date.parse(solvedAt);
  if (Number.isNaN(solvedMs)) return false;
  if (Number.isNaN(draftMs)) return true;
  return solvedMs > draftMs;
}

/** Source files for the active problem and language, autosaved to IndexedDB. */
export function useWorkspaceFiles(
  profile: LocalProfile | null,
  problem: VisibleProblem | null,
  problemId: string | null,
  starterByLanguage?: Partial<Record<PreferredLanguage, string>> | null,
  initialLang?: PreferredLanguage | null,
) {
  const profileId = profile?.id;
  const [userSelectedLang, setUserSelectedLang] = useState<PreferredLanguage | null>(initialLang ?? null);
  const [solutionLang, setSolutionLang] = useState<{ problemId: string; lang: PreferredLanguage } | null>(null);
  const matchedSolutionLang = solutionLang?.problemId === problemId ? solutionLang.lang : null;
  const activeLang = userSelectedLang ?? initialLang ?? matchedSolutionLang ?? profile?.preferredLanguage ?? "python";
  const mainFilename = getFilenameForLanguage(activeLang);
  const savedSolution = problem && problem.id === problemId ? (problem.savedSolution ?? null) : null;

  const [files, setFiles] = useState<WorkspaceFile[]>([{ name: "main.py", content: getStarterCode("python") }]);
  const filesRef = useRef(files);
  const [activeFile, setActiveFile] = useState(mainFilename);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("SAVED");
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingSaveRef = useRef<(() => Promise<void>) | null>(null);
  const saveVersionRef = useRef(0);
  const dirtyRef = useRef(false);
  const hasSavedDraftRef = useRef(false);
  const draftUpdatedAtRef = useRef<string | null>(null);
  const appliedSolutionKeyRef = useRef<string | null>(null);
  const loadedScopeRef = useRef<string | null>(null);
  const prevScopeRef = useRef<string | null>(null);
  const pendingOverrideRef = useRef<{ lang: PreferredLanguage; files: WorkspaceFile[] } | null>(null);

  const code = files.find((file) => file.name === activeFile)?.content ?? "";
  const mainCode = files.find((file) => file.name === mainFilename)?.content ?? "";
  const starter = starterByLanguage?.[activeLang] || problem?.starterCodes[activeLang] || getStarterCode(activeLang);
  const starterRef = useRef(starter);
  const savedSolutionRef = useRef<SavedSolution | null>(savedSolution);

  const updateFiles = useCallback((next: WorkspaceFile[]) => { filesRef.current = next; setFiles(next); }, []);

  const cancelPendingSave = useCallback(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    pendingSaveRef.current = null;
  }, []);

  const saveNow = useCallback((next: WorkspaceFile[]) => {
    if (!profileId) return Promise.resolve();
    return draftRepository.saveDraft(profileId, activeLang, next[0]?.content ?? "", next, problemId);
  }, [profileId, activeLang, problemId]);

  const persistFiles = useCallback((next: WorkspaceFile[]) => {
    dirtyRef.current = true;
    updateFiles(next);
    setSaveStatus("MODIFIED");
    cancelPendingSave();
    const version = ++saveVersionRef.current;
    const save = async () => {
      pendingSaveRef.current = null;
      if (!profileId) return;
      if (saveVersionRef.current === version) setSaveStatus("SAVING...");
      try {
        await saveNow(next);
        recordCodingDay(profileId);
        if (saveVersionRef.current === version) setSaveStatus("SAVED");
      } catch {
        if (saveVersionRef.current === version) setSaveStatus("MODIFIED");
      }
    };
    pendingSaveRef.current = save;
    saveTimeoutRef.current = setTimeout(save, 600);
  }, [profileId, saveNow, updateFiles, cancelPendingSave]);

  // Keep starter/solution refs current; apply saved DB solution or problem starter once draft lookup resolves.
  useEffect(() => {
    starterRef.current = starter;
    savedSolutionRef.current = savedSolution;
    const scopeKey = `${profileId ?? ""}:${problemId ?? ""}:${activeLang}`;
    if (dirtyRef.current || loadedScopeRef.current !== scopeKey) return;

    if (savedSolution && savedSolution.sourceCode !== null && problemId) {
      const solutionKey = `${profileId ?? ""}:${problemId}:${savedSolution.solvedAt}`;
      if (appliedSolutionKeyRef.current !== solutionKey) {
        const preferServer = !hasSavedDraftRef.current || isSolutionNewerThanDraft(draftUpdatedAtRef.current, savedSolution.solvedAt);
        if (savedSolution.language === activeLang) {
          appliedSolutionKeyRef.current = solutionKey;
          if (preferServer) {
            hasSavedDraftRef.current = true;
            updateFiles(resolveSolutionFiles(savedSolution));
            setActiveFile(mainFilename);
            setSaveStatus("SAVED");
            return;
          }
        } else if (preferServer && !initialLang && !userSelectedLang) {
          setSolutionLang({ problemId, lang: savedSolution.language });
          return;
        }
      }
    }

    if (hasSavedDraftRef.current) return;
    updateFiles([{ name: mainFilename, content: starter }]);
  }, [profileId, activeLang, problemId, starter, mainFilename, savedSolution, initialLang, userSelectedLang, updateFiles]);

  // Load the profile's existing single-file or multi-file draft, starting clean on problem/language switch.
  useEffect(() => {
    let current = true;
    const scopeKey = `${profileId ?? ""}:${problemId ?? ""}:${activeLang}`;
    if (prevScopeRef.current !== scopeKey) {
      prevScopeRef.current = scopeKey;
      dirtyRef.current = false;
      hasSavedDraftRef.current = false;
      draftUpdatedAtRef.current = null;
      loadedScopeRef.current = null;
    }
    const loaded = (draftFiles: WorkspaceFile[]) => {
      if (!current || dirtyRef.current) return;
      const primary = draftFiles.find((file) => file.name === mainFilename);
      updateFiles([{ name: mainFilename, content: primary?.content ?? starterRef.current }, ...draftFiles.filter((file) => file.name !== mainFilename)]);
      setActiveFile(mainFilename);
      setSaveStatus("SAVED");
    };
    if (pendingOverrideRef.current?.lang === activeLang) {
      const overrideFiles = normalizeFilesForLanguage(activeLang, pendingOverrideRef.current.files, starterRef.current);
      pendingOverrideRef.current = null;
      hasSavedDraftRef.current = true;
      loadedScopeRef.current = scopeKey;
      persistFiles(overrideFiles);
      setActiveFile(mainFilename);
      return () => {
        current = false;
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        void pendingSaveRef.current?.();
      };
    }
    // Always start clean with starter code immediately when switching problems or languages.
    loaded([{ name: mainFilename, content: starterRef.current }]);
    if (!profileId) {
      loadedScopeRef.current = scopeKey;
      return () => {
        current = false;
      };
    }
    draftRepository.getDraft(profileId, activeLang, problemId)
      .then((draft) => {
        if (!current) return;
        const hasDraft = Boolean(draft?.files?.length || draft?.code?.trim());
        const draftUpdatedAt = hasDraft ? (draft?.updatedAt ?? null) : null;
        hasSavedDraftRef.current = hasDraft;
        draftUpdatedAtRef.current = draftUpdatedAt;
        loadedScopeRef.current = scopeKey;

        const serverSolution = savedSolutionRef.current;
        if (serverSolution && serverSolution.sourceCode !== null && problemId) {
          const solutionKey = `${profileId}:${problemId}:${serverSolution.solvedAt}`;
          if (appliedSolutionKeyRef.current !== solutionKey) {
            const preferServer = !hasDraft || isSolutionNewerThanDraft(draftUpdatedAt, serverSolution.solvedAt);
            if (serverSolution.language === activeLang) {
              appliedSolutionKeyRef.current = solutionKey;
              if (preferServer) {
                hasSavedDraftRef.current = true;
                loaded(resolveSolutionFiles(serverSolution));
                return;
              }
            } else if (preferServer && !initialLang && !userSelectedLang) {
              setSolutionLang({ problemId, lang: serverSolution.language });
              return;
            }
          }
        }

        loaded(draft?.files?.length ? draft.files : [{ name: mainFilename, content: draft?.code?.trim() ? draft.code : starterRef.current }]);
      })
      .catch(() => {
        if (!current) return;
        hasSavedDraftRef.current = false;
        draftUpdatedAtRef.current = null;
        loadedScopeRef.current = scopeKey;
        const serverSolution = savedSolutionRef.current;
        if (serverSolution && serverSolution.sourceCode !== null && problemId && serverSolution.language === activeLang) {
          appliedSolutionKeyRef.current = `${profileId}:${problemId}:${serverSolution.solvedAt}`;
          hasSavedDraftRef.current = true;
          loaded(resolveSolutionFiles(serverSolution));
          return;
        }
        loaded([{ name: mainFilename, content: starterRef.current }]);
      });
    return () => {
      current = false;
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      void pendingSaveRef.current?.();
    };
  }, [profileId, activeLang, mainFilename, problemId, initialLang, userSelectedLang, updateFiles, persistFiles]);

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

  const setFileContent = useCallback((name: string, content: string) => {
    persistFiles(filesRef.current.map((file) => file.name === name ? { ...file, content } : file));
  }, [persistFiles]);

  const loadFiles = async (next: PreferredLanguage, nextFiles: WorkspaceFile[]) => {
    const targetMain = getFilenameForLanguage(next);
    const normalized = normalizeFilesForLanguage(next, nextFiles, "");
    if (next === activeLang) {
      persistFiles(normalized);
      setActiveFile(targetMain);
      return;
    }
    cancelPendingSave();
    if (saveStatus !== "SAVED") await saveNow(filesRef.current).catch(() => undefined);
    pendingOverrideRef.current = { lang: next, files: normalized };
    setUserSelectedLang(next);
  };

  const switchLanguage = async (next: PreferredLanguage, initialCode?: string) => {
    if (next === activeLang) {
      if (initialCode !== undefined) {
        const targetMain = getFilenameForLanguage(next);
        persistFiles(filesRef.current.map((file) => (file.name === targetMain ? { ...file, content: initialCode } : file)));
        setActiveFile(targetMain);
      }
      return;
    }
    cancelPendingSave();
    if (saveStatus !== "SAVED") await saveNow(filesRef.current).catch(() => undefined);
    if (initialCode !== undefined) {
      pendingOverrideRef.current = { lang: next, files: [{ name: getFilenameForLanguage(next), content: initialCode }] };
    }
    setUserSelectedLang(next);
  };

  /** Reset the active file to starter code (or empty for extra files), or every file. */
  const reset = async (all: boolean) => {
    cancelPendingSave();
    dirtyRef.current = true;
    const version = ++saveVersionRef.current;
    const next = all
      ? [{ name: mainFilename, content: starter }]
      : filesRef.current.map((file) => file.name === activeFile ? { ...file, content: file.name === mainFilename ? starter : "" } : file);
    await saveNow(next);
    updateFiles(next);
    if (all) setActiveFile(mainFilename);
    if (saveVersionRef.current === version) setSaveStatus("SAVED");
  };

  return {
    activeLang, mainFilename, files, activeFile, setActiveFile, code, mainCode, saveStatus, starter,
    setFileContent, switchLanguage, loadFiles, reset,
    addFile: (name: string) => { persistFiles([...filesRef.current, { name, content: "" }]); setActiveFile(name); },
    renameFile: (previous: string, name: string) => { persistFiles(filesRef.current.map((file) => file.name === previous ? { ...file, name } : file)); setActiveFile(name); },
    closeFile: (name: string) => { persistFiles(filesRef.current.filter((file) => file.name !== name)); if (activeFile === name) setActiveFile(mainFilename); },
  };
}
