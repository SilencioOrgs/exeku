"use client";

import React, { useState } from "react";
import { PixelBadge } from "@/components/retro/pixel-badge";
import { DotIcon, type DotIconName } from "@/components/retro/dot-icon";

type LanguageKey = "python" | "cpp" | "java";

interface SnippetData {
  name: string;
  filename: string;
  iconName: DotIconName;
  code: string[];
  demoOutput: string[];
}

const SNIPPETS: Record<LanguageKey, SnippetData> = {
  python: {
    name: "Python 3",
    filename: "reverse_bits.py",
    iconName: "python",
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
      "▶ Initializing local Python 3 sandbox demo...",
      "✓ Test 01: reverse_bits(43261596) => 964176192 [PASS]",
      "✓ Test 02: edge_case(0) => 0 [PASS]",
      "★ Demo Simulation Complete: 2/2 tests passed (Demo preview)",
    ],
  },
  cpp: {
    name: "C++",
    filename: "fast_matrix.cpp",
    iconName: "cplusplus",
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
      "▶ Initializing local GCC compiler mockup...",
      "✓ Syntax validation: C++20 standard verified",
      "✓ Test 01: SquareMatrix(4x4) Transpose [PASS]",
      "★ Demo Simulation Complete: In-memory swap verified (Demo preview)",
    ],
  },
  java: {
    name: "Java",
    filename: "BinarySearchTree.java",
    iconName: "java",
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
      "▶ Initializing local OpenJDK verification mockup...",
      "✓ Bytecode inspection: BinarySearchTree.class verified",
      "✓ Test 01: Lookup across 1,000 inserted keys [PASS]",
      "★ Demo Simulation Complete: Balanced traversal verified (Demo preview)",
    ],
  },
};

export function PixelTerminal() {
  const [activeLang, setActiveLang] = useState<LanguageKey>("python");
  const [isRunning, setIsRunning] = useState(false);
  const [hasRun, setHasRun] = useState(false);

  const current = SNIPPETS[activeLang];

  const handleRunDemo = () => {
    setIsRunning(true);
    setHasRun(false);
    setTimeout(() => {
      setIsRunning(false);
      setHasRun(true);
    }, 600);
  };

  const handleReset = () => {
    setIsRunning(false);
    setHasRun(false);
  };

  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
      {/* Decorative corner tabs */}
      <div className="pixel-corner-mark absolute top-0 left-0 w-3 h-3 bg-[var(--color-accent)] z-20" />
      <div className="pixel-corner-mark absolute top-0 right-0 w-3 h-3 bg-[var(--color-accent)] z-20" />
      <div className="pixel-corner-mark absolute bottom-0 left-0 w-3 h-3 bg-[var(--color-pink)] z-20" />
      <div className="pixel-corner-mark absolute bottom-0 right-0 w-3 h-3 bg-[var(--color-pink)] z-20" />

      {/* Terminal Title Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-4 py-2.5 bg-[var(--color-elevated)] border-b border-[var(--color-border)] font-mono text-xs">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-[var(--color-pink)] inline-block border border-black/60" />
            <span className="w-2.5 h-2.5 bg-[var(--color-accent)] inline-block border border-black/60" />
            <span className="w-2.5 h-2.5 bg-[var(--color-mint)] inline-block border border-black/60" />
          </div>
          <span className="text-[var(--color-text-main)] font-bold ml-1 tracking-wider">
            Example editor
          </span>
        </div>

        <div className="flex items-center gap-2">
          
          <PixelBadge variant="cyan">DEV PREVIEW</PixelBadge>
        </div>
      </div>

      {/* Disclaimer Banner: Strictly labeled as demo */}
      <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border)] bg-[var(--color-elevated)] px-3 py-2 text-xs text-[var(--color-text-muted)] sm:px-4">
        <div className="flex items-center gap-1.5">
          <DotIcon name="circleBlock" className="w-3.5 h-3.5 text-[var(--color-pink)] shrink-0" />
          <span>Interactive preview only — code is not executed here.</span>
        </div>
        <span className="hidden md:inline text-[0.625rem] uppercase opacity-75">Not a live compiler</span>
      </div>

      {/* Language Switcher Tabs with Doticons */}
      <div className="flex items-center border-b-2 border-[var(--color-border)] bg-[var(--color-canvas)] px-2 sm:px-4 overflow-x-auto">
        {(Object.keys(SNIPPETS) as LanguageKey[]).map((key) => {
          const isActive = activeLang === key;
          const snippet = SNIPPETS[key];
          return (
            <button
              key={key}
              type="button"
              onClick={() => {
                setActiveLang(key);
                setHasRun(false);
              }}
              className={`px-3 sm:px-4 py-2 text-xs font-mono font-medium tracking-wider flex items-center gap-2 border-b-2 transition-colors cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-accent)] ${
                isActive
                  ? "border-[var(--color-accent)] text-[var(--color-accent)] bg-[var(--color-elevated)]"
                  : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-elevated)]"
              }`}
            >
              <DotIcon
                name={snippet.iconName}
                size={14}
                className={isActive ? "text-[var(--color-accent)]" : "text-[var(--color-text-muted)]"}
              />
              <span>{snippet.name}</span>
              <span className="text-[0.625rem] text-[var(--color-text-dim)]">({snippet.filename})</span>
            </button>
          );
        })}
      </div>

      {/* Code Editor Body Viewport */}
      <div className="relative p-3 sm:p-5 bg-[var(--color-canvas)] font-mono text-xs sm:text-sm overflow-x-auto min-h-[220px]">
        {/* Subtle Scanlines Overlay */}
        <div className="hidden" />

        <div className="relative z-10 flex">
          {/* Line Numbers */}
          <div className="select-none text-[var(--color-text-dim)] pr-4 text-right border-r border-[var(--color-border)]/60 font-mono text-xs sm:text-sm leading-6">
            {current.code.map((_, i) => (
              <div key={i}>{String(i + 1).padStart(2, "0")}</div>
            ))}
          </div>

          {/* Code Lines */}
          <div className="pl-4 font-mono text-xs sm:text-sm leading-6 text-[var(--color-text-main)] flex-1">
            {current.code.map((line, i) => (
              <div key={i} className="whitespace-pre">
                {line.startsWith("#") || line.startsWith("//") ? (
                  <span className="text-[var(--color-text-dim)] italic">{line}</span>
                ) : line.includes("def ") || line.includes("void ") || line.includes("public class ") ? (
                  <span className="text-[var(--color-accent)] font-semibold">{line}</span>
                ) : line.includes("return") || line.includes("for ") || line.includes("while ") ? (
                  <span className="text-[var(--color-pink)]">{line}</span>
                ) : (
                  <span>{line}</span>
                )}
              </div>
            ))}
            
          </div>
        </div>
      </div>

      {/* Action Strip & Simulated Terminal Output */}
      <div className="p-3 sm:p-4 bg-[var(--color-surface)] border-t border-[var(--color-border)]">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRunDemo}
              disabled={isRunning}
              className="px-4 py-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[var(--color-accent-foreground)] font-mono font-bold text-xs uppercase flex items-center gap-1.5 transition-all [box-shadow:var(--shadow-btn)] active:translate-x-[1px] active:translate-y-[1px] cursor-pointer disabled:opacity-50"
            >
              <DotIcon name="circlePlay" size={14} className="text-[var(--color-accent-foreground)]" />
              {isRunning ? "Simulating..." : "Run Demo"}
            </button>

            {hasRun && (
              <button
                type="button"
                onClick={handleReset}
                className="px-3 py-2 bg-[var(--color-elevated)] hover:bg-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] font-mono text-xs uppercase flex items-center gap-1 border border-[var(--color-border)] cursor-pointer"
                title="Reset simulation"
              >
                <DotIcon name="arrowLeft" className="w-3 h-3" />
                Reset
              </button>
            )}
          </div>

          <div className="text-[0.6875rem] font-mono text-[var(--color-text-muted)] flex items-center gap-2">
            <DotIcon name="windows" size={13} className="text-[var(--color-mint)]" />
            <span>Target Architecture: Windows x64</span>
          </div>
        </div>

        {/* Output Console Box */}
        <div className="p-2.5 sm:p-3 bg-[var(--color-canvas)] border border-[var(--color-border)] font-mono text-xs text-[var(--color-text-muted)] min-h-[72px]">
          {isRunning ? (
            <div className="text-[var(--color-accent)] animate-pulse flex items-center gap-2">
              <span className="animate-spin">◐</span>
              <span>Running local verification simulation for {current.name}...</span>
            </div>
          ) : hasRun ? (
            <div className="space-y-1">
              {current.demoOutput.map((outLine, idx) => (
                <div
                  key={idx}
                  className={`flex items-start gap-1.5 ${
                    outLine.includes("PASS") || outLine.includes("Complete")
                      ? "text-[var(--color-mint)]"
                      : "text-[var(--color-primary-text)]"
                  }`}
                >
                  {outLine.includes("✓") && (
                    <DotIcon name="circleCheck" size={14} className="text-[var(--color-mint)] mt-0.5 shrink-0" />
                  )}
                  <span>{outLine}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[var(--color-text-dim)] italic">
              Click &quot;Run Demo <DotIcon name="circlePlay" size={14} aria-hidden="true" />&quot; to simulate how local tests will run on your machine once the execution engine is released.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
