"use client";

import React, { useEffect, useRef, useState } from "react";
import { AlertCircle, ArrowLeft, CheckCircle2, CirclePlay, Code2, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLoader } from "@/components/brand-loader";

type LanguageKey = "python" | "cpp" | "java";

interface SnippetData {
  name: string;
  filename: string;
  icon: LucideIcon;
  code: string[];
  demoOutput: string[];
}

const SNIPPETS: Record<LanguageKey, SnippetData> = {
  python: {
    name: "Python 3",
    filename: "reverse_bits.py",
    icon: Code2,
    code: [
      "# Exeku Curriculum: Bitwise Operations",
      "def reverse_bits(n: int) -> int:",
      "    result = 0",
      "    for _ in range(32):",
      "        result = (result << 1) | (n & 1)",
      "        n >>= 1",
      "    return result",
      "",
      "# Demo test case",
      "assert reverse_bits(43261596) == 964176192",
    ],
    demoOutput: [
      "Initializing Python 3 sandbox preview…",
      "AC · Test 01: reverse_bits(43261596) => 964176192",
      "AC · Test 02: edge_case(0) => 0",
      "Demo preview complete: 2/2 tests passed",
    ],
  },
  cpp: {
    name: "C++",
    filename: "fast_matrix.cpp",
    icon: Code2,
    code: [
      "// Exeku Curriculum: Cache Locality & SIMD",
      "#include <vector>",
      "#include <iostream>",
      "",
      "void transpose(std::vector<int>& matrix, int n) {",
      "    for (int i = 0; i < n; ++i) {",
      "        for (int j = i + 1; j < n; ++j) {",
      "            std::swap(matrix[i * n + j], matrix[j * n + i]);",
      "        }",
      "    }",
      "}",
    ],
    demoOutput: [
      "Initializing GCC compiler preview…",
      "AC · Syntax check: C++20 standard verified",
      "AC · Test 01: SquareMatrix(4x4) transpose",
      "Demo preview complete: in-memory swap verified",
    ],
  },
  java: {
    name: "Java",
    filename: "BinarySearchTree.java",
    icon: Code2,
    code: [
      "// Exeku Curriculum: Self-Balancing Trees",
      "public class BinarySearchTree {",
      "    private Node root;",
      "",
      "    public boolean contains(int value) {",
      "        Node curr = root;",
      "        while (curr != null) {",
      "            if (value == curr.val) return true;",
      "            curr = (value < curr.val) ? curr.left : curr.right;",
      "        }",
      "        return false;",
      "    }",
      "}",
    ],
    demoOutput: [
      "Initializing OpenJDK verification preview…",
      "AC · Bytecode check: BinarySearchTree.class verified",
      "AC · Test 01: Lookup across 1,000 inserted keys",
      "Demo preview complete: balanced traversal verified",
    ],
  },
};

export function PixelTerminal() {
  const [activeLang, setActiveLang] = useState<LanguageKey>("python");
  const [isRunning, setIsRunning] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const current = SNIPPETS[activeLang];

  const clearTimer = () => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => () => clearTimer(), []);

  const handleRunDemo = () => {
    clearTimer();
    setIsRunning(true);
    setHasRun(false);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      setIsRunning(false);
      setHasRun(true);
    }, 600);
  };

  const handleReset = () => {
    clearTimer();
    setIsRunning(false);
    setHasRun(false);
  };

  const handleSelectLang = (key: LanguageKey) => {
    clearTimer();
    setActiveLang(key);
    setIsRunning(false);
    setHasRun(false);
  };

  return (
    <div className="skeuo-card relative w-full overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)]">

      {/* Terminal Title Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-4 py-2.5 bg-[var(--color-elevated)] border-b border-[var(--color-border)] text-xs">
        <div className="flex items-center gap-2">
          <div aria-hidden="true" className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-[var(--color-primary-text)] inline-block border border-black/60" />
            <span className="size-2.5 rounded-full bg-[var(--color-accent)] inline-block border border-black/60" />
            <span className="size-2.5 rounded-full bg-[var(--color-mint)] inline-block border border-black/60" />
          </div>
          <span className="text-[var(--color-text-main)] font-semibold ml-1">
            Editor demo
          </span>
        </div>
      </div>

      {/* Disclaimer Banner: Strictly labeled as demo */}
      <div className="px-3 sm:px-4 py-1.5 bg-[var(--color-elevated)] border-b border-[var(--color-primary-text)]/40 flex items-center justify-between gap-2 text-xs text-[var(--color-primary-text)]">
        <div className="flex items-center gap-1.5">
          <AlertCircle aria-hidden="true" className="w-3.5 h-3.5 text-[var(--color-primary-text)] shrink-0" />
          <span>Demo animation. Real code runs in the workspace sandbox.</span>
        </div>
        <span className="hidden md:inline text-xs opacity-75">Not a live compiler</span>
      </div>

      {/* Language Switcher Tabs */}
      <div role="tablist" aria-label="Sample languages" className="flex items-center border-b border-[var(--color-border)] bg-[var(--color-canvas)] px-2 sm:px-4 overflow-x-auto">
        {(Object.keys(SNIPPETS) as LanguageKey[]).map((key) => {
          const isActive = activeLang === key;
          const snippet = SNIPPETS[key];
          return (
            <Button
              key={key}
              type="button"
              variant="ghost"
              size="sm"
              role="tab"
              id={`demo-tab-${key}`}
              aria-selected={isActive}
              aria-controls={`demo-panel-${key}`}
              onClick={() => handleSelectLang(key)}
              className={`h-9 shrink-0 rounded-none border-b-2 px-3 sm:px-4 text-xs font-medium ${
                isActive
                  ? "border-[var(--color-accent)] bg-[var(--color-elevated)] text-[var(--color-accent)]"
                  : "border-transparent text-[var(--color-text-muted)] hover:bg-[var(--color-elevated)] hover:text-[var(--color-text-main)]"
              }`}
            >
              <snippet.icon size={14} aria-hidden="true" className={isActive ? "text-[var(--color-accent)]" : "text-[var(--color-text-muted)]"} />
              <span>{snippet.name}</span>
              <span className="font-code text-xs text-[var(--color-text-dim)]">({snippet.filename})</span>
            </Button>
          );
        })}
      </div>

      {/* Code Editor Body Viewport */}
      <div
        role="tabpanel"
        id={`demo-panel-${activeLang}`}
        aria-labelledby={`demo-tab-${activeLang}`}
        className="relative p-3 sm:p-5 bg-[var(--color-canvas)] font-code text-xs sm:text-sm overflow-x-auto min-h-[220px]"
      >
        <div className="relative z-10 flex">
          {/* Line Numbers */}
          <div aria-hidden="true" className="select-none text-[var(--color-text-dim)] pr-4 text-right border-r border-[var(--color-border)]/60 font-code text-xs sm:text-sm leading-6">
            {current.code.map((_, i) => (
              <div key={i}>{String(i + 1).padStart(2, "0")}</div>
            ))}
          </div>

          {/* Code Lines */}
          <div className="pl-4 font-code text-xs sm:text-sm leading-6 text-[var(--color-text-main)] flex-1">
            {current.code.map((line, i) => (
              <div key={i} className="whitespace-pre">
                {line.startsWith("#") || line.startsWith("//") ? (
                  <span className="text-[var(--color-text-dim)] italic">{line}</span>
                ) : line.includes("def ") || line.includes("void ") || line.includes("public class ") ? (
                  <span className="text-[var(--color-accent)] font-semibold">{line}</span>
                ) : line.includes("return") || line.includes("for ") || line.includes("while ") ? (
                  <span className="text-[var(--color-primary-text)]">{line}</span>
                ) : (
                  <span>{line}</span>
                )}
              </div>
            ))}
            <div aria-hidden="true" className="text-[var(--color-accent)] inline-block animate-terminal-blink">█</div>
          </div>
        </div>
      </div>

      {/* Action Strip & Simulated Terminal Output */}
      <div className="p-3 sm:p-4 bg-[var(--color-surface)] border-t border-[var(--color-border)]">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={handleRunDemo}
              disabled={isRunning}
            >
              <CirclePlay size={14} aria-hidden="true" />
              {isRunning ? "Simulating…" : "Run demo"}
            </Button>

            {hasRun && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleReset}
                title="Reset simulation"
              >
                <ArrowLeft aria-hidden="true" className="w-3 h-3" />
                Reset
              </Button>
            )}
          </div>
        </div>

        {/* Output Console Box */}
        <div className="rounded-lg p-2.5 sm:p-3 bg-[var(--color-canvas)] border border-[var(--color-border)] font-code text-xs text-[var(--color-text-muted)] min-h-[72px]">
          {isRunning ? (
            <BrandLoader label={`Running preview for ${current.name}…`} height={20} className="justify-start py-2" />
          ) : hasRun ? (
            <div className="space-y-1">
              {current.demoOutput.map((outLine, idx) => (
                <div
                  key={idx}
                  className={`flex items-start gap-1.5 ${
                    outLine.startsWith("AC") || outLine.includes("complete")
                      ? "text-[var(--color-mint)]"
                      : "text-[var(--color-primary-text)]"
                  }`}
                >
                  {outLine.startsWith("AC") && (
                    <CheckCircle2 size={14} aria-hidden="true" className="text-[var(--color-mint)] mt-0.5 shrink-0" />
                  )}
                  <span>{outLine}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[var(--color-text-dim)]">
              Click &quot;Run demo&quot; to see how test results look in the workspace.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
