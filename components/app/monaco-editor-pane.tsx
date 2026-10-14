"use client";

import React, { useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import type { OnMount } from "@monaco-editor/react";
import type * as MonacoType from "monaco-editor";
import { useAppearance } from "@/hooks/use-appearance";
import { resolveEditorAppearance } from "@/lib/editor-appearance";

export interface MonacoEditorPaneProps {
  language: string;
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  path?: string;
  onRun?: () => void;
  onSubmit?: () => void;
}

function EditorLoadingSkeleton() {
  return (
    <div className="w-full h-full min-h-[380px] bg-[var(--color-canvas)] p-4 font-mono text-xs text-[var(--color-text-dim)] flex flex-col justify-between select-none">
      <div className="space-y-2">
        <div className="flex items-center gap-4 text-[var(--color-text-muted)]">
          <span className="w-6 text-right text-[var(--color-border)]">1</span>
          <span className="w-48 h-3 bg-[var(--color-elevated)] rounded-none animate-pulse" />
        </div>
        <div className="flex items-center gap-4 text-[var(--color-text-muted)]">
          <span className="w-6 text-right text-[var(--color-border)]">2</span>
          <span className="w-32 h-3 bg-[var(--color-elevated)] rounded-none animate-pulse" />
        </div>
        <div className="flex items-center gap-4 text-[var(--color-text-muted)]">
          <span className="w-6 text-right text-[var(--color-border)]">3</span>
          <span className="w-64 h-3 bg-[var(--color-elevated)] rounded-none animate-pulse" />
        </div>
        <div className="flex items-center gap-4 text-[var(--color-text-muted)]">
          <span className="w-6 text-right text-[var(--color-border)]">4</span>
          <span className="w-24 h-3 bg-[var(--color-elevated)] rounded-none animate-pulse" />
        </div>
      </div>
      <div className="flex items-center justify-between text-[11px] border-t border-[var(--color-border)] pt-2">
        <span className="text-[var(--color-accent)] animate-pulse">MOUNTING LOCAL MONACO RUNTIME...</span>
        <span className="text-[var(--color-text-dim)]">PERSISTENT BUFFER</span>
      </div>
    </div>
  );
}

const DynamicEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => <EditorLoadingSkeleton />,
});

export function MonacoEditorPane({
  language,
  value,
  onChange,
  readOnly = false,
  path,
  onRun,
  onSubmit,
}: MonacoEditorPaneProps) {
  const { preferences, effectiveColorMode, effectiveReducedMotion } = useAppearance();
  const editorRef = useRef<MonacoType.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof MonacoType | null>(null);
  const runRef = useRef(onRun);
  const submitRef = useRef(onSubmit);
  useEffect(() => { runRef.current = onRun; submitRef.current = onSubmit; }, [onRun, onSubmit]);

  // Compute active Monaco theme name and independent editor typography.
  const appearance = React.useMemo(() => resolveEditorAppearance(preferences, effectiveColorMode, effectiveReducedMotion), [preferences, effectiveColorMode, effectiveReducedMotion]);
  const activeMonacoTheme = appearance.theme;
  const editorOptions = React.useMemo(() => ({
    ...appearance.options,
    fontFamily: appearance.options.fontFamily.replace("var(--font-geist-mono)", typeof document === "undefined" ? "monospace" : getComputedStyle(document.documentElement).getPropertyValue("--font-geist-mono").trim()),
  }), [appearance]);

  // Define themes once on mount
  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // 1. Pixel Arcade Dark
    monaco.editor.defineTheme("exeku-pixel-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "", foreground: "E6E0F8", background: "090514" },
        { token: "comment", foreground: "7A6E9B", fontStyle: "italic" },
        { token: "keyword", foreground: "00F0FF", fontStyle: "bold" },
        { token: "string", foreground: "00FF9D" },
        { token: "number", foreground: "FF007A" },
        { token: "type", foreground: "9E00FF" },
        { token: "function", foreground: "00F0FF" },
      ],
      colors: {
        "editor.background": "#090514",
        "editor.foreground": "#E6E0F8",
        "editor.lineHighlightBackground": "#1B0F36",
        "editorCursor.foreground": "#00F0FF",
        "editorLineNumber.foreground": "#422872",
        "editorLineNumber.activeForeground": "#00F0FF",
        "editor.selectionBackground": "#3D2275",
        "editor.inactiveSelectionBackground": "#2E1A57",
      },
    });

    // 2. Pixel Arcade Light
    monaco.editor.defineTheme("exeku-pixel-light", {
      base: "vs",
      inherit: true,
      rules: [
        { token: "", foreground: "1F0A38", background: "F5EEFD" },
        { token: "comment", foreground: "856E9E", fontStyle: "italic" },
        { token: "keyword", foreground: "7E00CC", fontStyle: "bold" },
        { token: "string", foreground: "008F59" },
        { token: "number", foreground: "D60067" },
        { token: "type", foreground: "00828C" },
        { token: "function", foreground: "7E00CC" },
      ],
      colors: {
        "editor.background": "#F5EEFD",
        "editor.foreground": "#1F0A38",
        "editor.lineHighlightBackground": "#EDE0FA",
        "editorCursor.foreground": "#7E00CC",
        "editorLineNumber.foreground": "#A894C7",
        "editorLineNumber.activeForeground": "#7E00CC",
        "editor.selectionBackground": "#D3B8F5",
      },
    });

    // 3. Minimal SaaS Dark
    monaco.editor.defineTheme("exeku-minimal-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "", foreground: "E5E7EB", background: "0B0F19" },
        { token: "comment", foreground: "6B7280", fontStyle: "italic" },
        { token: "keyword", foreground: "60A5FA", fontStyle: "bold" },
        { token: "string", foreground: "34D399" },
        { token: "number", foreground: "FBBF24" },
        { token: "type", foreground: "818CF8" },
        { token: "function", foreground: "93C5FD" },
      ],
      colors: {
        "editor.background": "#0B0F19",
        "editor.foreground": "#E5E7EB",
        "editor.lineHighlightBackground": "#1F2937",
        "editorCursor.foreground": "#3B82F6",
        "editorLineNumber.foreground": "#4B5563",
        "editorLineNumber.activeForeground": "#60A5FA",
        "editor.selectionBackground": "#374151",
      },
    });

    // 4. Minimal SaaS Light
    monaco.editor.defineTheme("exeku-minimal-light", {
      base: "vs",
      inherit: true,
      rules: [
        { token: "", foreground: "0F172A", background: "F8FAFC" },
        { token: "comment", foreground: "94A3B8", fontStyle: "italic" },
        { token: "keyword", foreground: "2563EB", fontStyle: "bold" },
        { token: "string", foreground: "059669" },
        { token: "number", foreground: "D97706" },
        { token: "type", foreground: "4F46E5" },
        { token: "function", foreground: "1D4ED8" },
      ],
      colors: {
        "editor.background": "#F8FAFC",
        "editor.foreground": "#0F172A",
        "editor.lineHighlightBackground": "#F1F5F9",
        "editorCursor.foreground": "#2563EB",
        "editorLineNumber.foreground": "#94A3B8",
        "editorLineNumber.activeForeground": "#2563EB",
        "editor.selectionBackground": "#E2E8F0",
      },
    });

    // 5. Studio CRM Dark
    monaco.editor.defineTheme("exeku-studio-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "", foreground: "EDEDED", background: "0A0A0A" },
        { token: "comment", foreground: "71717A", fontStyle: "italic" },
        { token: "keyword", foreground: "10B981", fontStyle: "bold" },
        { token: "string", foreground: "F59E0B" },
        { token: "number", foreground: "F43F5E" },
        { token: "type", foreground: "06B6D4" },
        { token: "function", foreground: "10B981" },
      ],
      colors: {
        "editor.background": "#0A0A0A",
        "editor.foreground": "#EDEDED",
        "editor.lineHighlightBackground": "#1F1F1F",
        "editorCursor.foreground": "#10B981",
        "editorLineNumber.foreground": "#52525B",
        "editorLineNumber.activeForeground": "#10B981",
        "editor.selectionBackground": "#2A2A2A",
      },
    });

    // 6. Studio CRM Light
    monaco.editor.defineTheme("exeku-studio-light", {
      base: "vs",
      inherit: true,
      rules: [
        { token: "", foreground: "18181B", background: "F4F4F5" },
        { token: "comment", foreground: "71717A", fontStyle: "italic" },
        { token: "keyword", foreground: "059669", fontStyle: "bold" },
        { token: "string", foreground: "D97706" },
        { token: "number", foreground: "E11D48" },
        { token: "type", foreground: "0891B2" },
        { token: "function", foreground: "059669" },
      ],
      colors: {
        "editor.background": "#F4F4F5",
        "editor.foreground": "#18181B",
        "editor.lineHighlightBackground": "#E4E4E7",
        "editorCursor.foreground": "#059669",
        "editorLineNumber.foreground": "#A1A1AA",
        "editorLineNumber.activeForeground": "#059669",
        "editor.selectionBackground": "#D4D4D8",
      },
    });

    // 7. High Contrast Dark
    monaco.editor.defineTheme("exeku-hc-dark", {
      base: "hc-black",
      inherit: true,
      rules: [
        { token: "", foreground: "FFFFFF", background: "000000" },
        { token: "comment", foreground: "00FF00", fontStyle: "italic" },
        { token: "keyword", foreground: "FFFF00", fontStyle: "bold" },
        { token: "string", foreground: "00FFFF" },
        { token: "number", foreground: "FF80FF" },
        { token: "type", foreground: "FFFF00" },
        { token: "function", foreground: "00FFFF" },
      ],
      colors: {
        "editor.background": "#000000",
        "editor.foreground": "#FFFFFF",
        "editor.lineHighlightBackground": "#111111",
        "editorCursor.foreground": "#FFFF00",
        "editorLineNumber.foreground": "#FFFFFF",
        "editorLineNumber.activeForeground": "#FFFF00",
        "editor.selectionBackground": "#333333",
      },
    });

    // 8. High Contrast Light
    monaco.editor.defineTheme("exeku-hc-light", {
      base: "hc-light",
      inherit: true,
      rules: [
        { token: "", foreground: "000000", background: "FFFFFF" },
        { token: "comment", foreground: "005500", fontStyle: "italic" },
        { token: "keyword", foreground: "0000FF", fontStyle: "bold" },
        { token: "string", foreground: "990000" },
        { token: "number", foreground: "660099" },
        { token: "type", foreground: "0000FF" },
        { token: "function", foreground: "000000" },
      ],
      colors: {
        "editor.background": "#FFFFFF",
        "editor.foreground": "#000000",
        "editor.lineHighlightBackground": "#F0F0F0",
        "editorCursor.foreground": "#0000FF",
        "editorLineNumber.foreground": "#000000",
        "editorLineNumber.activeForeground": "#0000FF",
        "editor.selectionBackground": "#DDDDDD",
      },
    });

    monaco.editor.setTheme(activeMonacoTheme);
    editor.updateOptions(editorOptions);
    // Monaco has its own keyboard handling; document shortcuts alone do not reliably reach it.
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => runRef.current?.());
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Enter, () => submitRef.current?.());
  };

  // Live update options without remounting or resetting editor buffer
  useEffect(() => {
    if (monacoRef.current && editorRef.current) {
      monacoRef.current.editor.setTheme(activeMonacoTheme);
      editorRef.current.updateOptions(editorOptions);
    }
  }, [activeMonacoTheme, editorOptions]);

  return (
    <div className="w-full h-full min-h-[380px] bg-[var(--color-canvas)] overflow-hidden">
      <DynamicEditor
        path={path}
        saveViewState
        keepCurrentModel
        height="100%"
        language={language}
        value={value}
        theme={activeMonacoTheme}
        onChange={(val) => onChange(val ?? "")}
        onMount={handleEditorDidMount}
        options={{
          ...editorOptions,
          fontLigatures: preferences.editorLigatures,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          wordWrap: "on",
          automaticLayout: true,
          renderLineHighlight: "all",
          tabSize: 4,
          insertSpaces: true,
          readOnly,
          padding: { top: 12, bottom: 12 },
        }}
      />
    </div>
  );
}
