"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
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

const LANGUAGE_ICONS: Record<PreferredLanguage, DotIconName> = {
  python: "python",
  java: "java",
  cpp: "cplusplus",
  c: "file",
};

export function WorkspaceView() {
  const { profile } = useProfile();
  const [userSelectedLang, setUserSelectedLang] = useState<PreferredLanguage | null>(null);
  const activeLang = userSelectedLang ?? profile?.preferredLanguage ?? "python";
  const [code, setCode] = useState<string>("");
  const [saveStatus, setSaveStatus] = useState<"SAVED" | "SAVING..." | "MODIFIED">("SAVED");
  const [isResetOpen, setIsResetOpen] = useState<boolean>(false);
  const [consoleOpen, setConsoleOpen] = useState<boolean>(true);
  const [consoleLogs, setConsoleLogs] = useState<string[]>([
    "[EXE-SANDBOX] Local execution runner will connect in Phase 2B.",
    "[EXE-SANDBOX] Host compilers (CPython, OpenJDK, GCC/MSVC) will execute directly on this machine.",
  ]);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load draft for active language
  useEffect(() => {
    if (!profile) return;
    let isCurrent = true;

    async function loadBuffer() {
      if (!profile) return;
      try {
        const draft = await draftRepository.getDraft(profile.id, activeLang);
        if (isCurrent) {
          if (draft) {
            setCode(draft.code);
          } else {
            setCode(getStarterCode(activeLang));
          }
          setSaveStatus("SAVED");
        }
      } catch {
        if (isCurrent) {
          setCode(getStarterCode(activeLang));
          setSaveStatus("SAVED");
        }
      }
    }

    loadBuffer();
    return () => {
      isCurrent = false;
    };
  }, [profile, activeLang]);

  // Autosave code changes with debounce
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
          await draftRepository.saveDraft(
            profile.id,
            activeLang,
            newCode
          );
          setSaveStatus("SAVED");
        } catch {
          setSaveStatus("MODIFIED");
        }
      }, 600);
    },
    [profile, activeLang]
  );

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Handle language switch
  const handleSwitchLanguage = async (newLang: PreferredLanguage) => {
    if (newLang === activeLang) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Immediately flush any unsaved draft for the current language
    if (profile && saveStatus !== "SAVED") {
      try {
        await draftRepository.saveDraft(
          profile.id,
          activeLang,
          code
        );
      } catch {
        // Continue
      }
    }

    setUserSelectedLang(newLang);
  };

  // Reset current buffer to default starter code
  const handleConfirmReset = async () => {
    if (!profile) return;
    try {
      const reset = await draftRepository.resetDraft(profile.id, activeLang);
      setCode(reset.code);
      setSaveStatus("SAVED");
      setIsResetOpen(false);
      setConsoleLogs((prev) => [
        ...prev,
        `[SYS] Buffer reset to starter template: ${getFilenameForLanguage(activeLang)}`,
      ]);
    } catch {
      setIsResetOpen(false);
    }
  };

  // Download code file to user machine
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

    setConsoleLogs((prev) => [
      ...prev,
      `[SYS] Exported buffer file: ${filename} (${code.length} bytes)`,
    ]);
  };

  // Mock execution trigger
  const handleRunCode = () => {
    const filename = getFilenameForLanguage(activeLang);
    setConsoleLogs((prev) => [
      ...prev,
      `[RUN] Executing ${filename} in offline sandbox...`,
      `[STANDBY] Compiler runner offline. Execution engine arrives in Phase 2B.`,
    ]);
  };

  const filename = getFilenameForLanguage(activeLang);
  const monacoLang = getMonacoLanguage(activeLang);

  return (
    <div className="space-y-4 flex flex-col h-[calc(100vh-140px)] min-h-[640px]">
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

          <div className="flex items-center gap-1.5">
            <PixelButton
              variant="cyan"
              size="sm"
              onClick={handleRunCode}
              className="text-xs font-pixel"
            >
              RUN CODE ▶
            </PixelButton>
            <PixelBadge variant="purple" bracketed className="text-[10px] hidden md:inline-flex">
              PHASE 2B
            </PixelBadge>
          </div>
        </div>
      </PixelCard>

      {/* Editor & Console Split Body */}
      <div className="flex-1 flex flex-col min-h-0 border-2 border-[#2E1A57] bg-[#090514] relative">
        {/* Monaco Editor Pane */}
        <div className="flex-1 min-h-0 relative">
          <MonacoEditorPane
            language={monacoLang}
            value={code}
            onChange={handleCodeChange}
          />
        </div>

        {/* Docked Terminal Console Pane */}
        <div className="border-t-2 border-[#2E1A57] bg-[#0A0518] shrink-0">
          {/* Console Header */}
          <div className="px-3 py-1.5 bg-[#120A24] border-b border-[#2E1A57] flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setConsoleOpen(!consoleOpen)}
                className="text-[#00F0FF] hover:text-white font-bold cursor-pointer"
              >
                {consoleOpen ? "▼" : "▲"}
              </button>
              <span className="text-white font-pixel">LOCAL CONSOLE OUTPUT</span>
              <PixelBadge variant="mint" bracketed className="text-[9px]">
                STANDBY
              </PixelBadge>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-[#7A6E9B]">
              <span>{code.length} bytes in buffer</span>
              <button
                type="button"
                onClick={() => setConsoleLogs([])}
                className="hover:text-white cursor-pointer underline"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Console Output Logs */}
          {consoleOpen && (
            <div className="p-3 font-mono text-xs text-[#00FF9D] bg-[#06030D] h-28 overflow-y-auto space-y-1 select-text">
              {consoleLogs.map((log, idx) => (
                <div
                  key={idx}
                  className={
                    log.startsWith("[STANDBY]")
                      ? "text-[#00F0FF]"
                      : log.startsWith("[SYS]")
                      ? "text-[#A79EC4]"
                      : log.startsWith("[RUN]")
                      ? "text-[#FF007A]"
                      : "text-[#00FF9D]"
                  }
                >
                  &gt; {log}
                </div>
              ))}
              <div className="flex items-center gap-1 text-[#7A6E9B] animate-pulse">
                <span>&gt; _</span>
              </div>
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
              This will overwrite your currently saved draft for <strong>{filename}</strong> with
              the default starter code. Unsaved modifications will be permanently replaced.
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
