"use client";

import React from "react";
import dynamic from "next/dynamic";
import type { OnMount } from "@monaco-editor/react";

export interface MonacoEditorPaneProps {
  language: string;
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
}

function EditorLoadingSkeleton() {
  return (
    <div className="w-full h-full min-h-[380px] bg-[#090514] p-4 font-mono text-xs text-[#7A6E9B] flex flex-col justify-between select-none">
      <div className="space-y-2">
        <div className="flex items-center gap-4 text-[#A79EC4]">
          <span className="w-6 text-right text-[#3D2275]">1</span>
          <span className="w-48 h-3 bg-[#1B0F36] rounded-none animate-pulse" />
        </div>
        <div className="flex items-center gap-4 text-[#A79EC4]">
          <span className="w-6 text-right text-[#3D2275]">2</span>
          <span className="w-32 h-3 bg-[#1B0F36] rounded-none animate-pulse" />
        </div>
        <div className="flex items-center gap-4 text-[#A79EC4]">
          <span className="w-6 text-right text-[#3D2275]">3</span>
          <span className="w-64 h-3 bg-[#1B0F36] rounded-none animate-pulse" />
        </div>
        <div className="flex items-center gap-4 text-[#A79EC4]">
          <span className="w-6 text-right text-[#3D2275]">4</span>
          <span className="w-24 h-3 bg-[#1B0F36] rounded-none animate-pulse" />
        </div>
      </div>
      <div className="flex items-center justify-between text-[11px] border-t border-[#2E1A57] pt-2">
        <span className="text-[#00F0FF] animate-pulse">MOUNTING LOCAL MONACO RUNTIME...</span>
        <span className="text-[#7A6E9B]">OFFLINE BUFFER</span>
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
}: MonacoEditorPaneProps) {
  const handleEditorDidMount: OnMount = (_, monaco) => {
    monaco.editor.defineTheme("exeku-dark", {
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
    monaco.editor.setTheme("exeku-dark");
  };

  return (
    <div className="w-full h-full min-h-[380px] bg-[#090514] overflow-hidden">
      <DynamicEditor
        height="100%"
        language={language}
        value={value}
        theme="exeku-dark"
        onChange={(val) => onChange(val ?? "")}
        onMount={handleEditorDidMount}
        options={{
          fontFamily: "var(--font-geist-mono), monospace",
          fontSize: 14,
          lineHeight: 22,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          wordWrap: "on",
          automaticLayout: true,
          cursorBlinking: "smooth",
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
