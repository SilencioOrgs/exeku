"use client";

import React, { useEffect, useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, CirclePlay, Code2, Cpu, FileCode2, ShieldCheck, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLoader } from "@/components/brand-loader";

type LanguageKey = "python" | "java" | "cpp" | "c";

interface SnippetData {
  name: string;
  filename: string;
  runtime: string;
  icon: LucideIcon;
  code: string[];
  demoOutput: Array<{ code: string; label: string; detail: string }>;
}

const LANGUAGE_ORDER: LanguageKey[] = ["python", "java", "cpp", "c"];

const SNIPPETS: Record<LanguageKey, SnippetData> = {
  python: {
    name: "Python 3",
    filename: "reverse_bits.py",
    runtime: "Python 3.12 · 256 MB",
    icon: Code2,
    code: [
      "def reverse_bits(n: int) -> int:",
      "    result = 0",
      "    for _ in range(32):",
      "        result = (result << 1) | (n & 1)",
      "        n >>= 1",
      "    return result",
      "",
      "assert reverse_bits(43261596) == 964176192",
    ],
    demoOutput: [
      { code: "AC", label: "Test 01 · Accepted", detail: "reverse_bits(43261596) -> 964176192 (12 ms)" },
      { code: "AC", label: "Test 02 · Accepted", detail: "reverse_bits(0) -> 0 (9 ms)" },
      { code: "AC", label: "Demo verdict · 2/2 passed", detail: "Simulated preview · real code runs in workspace" },
    ],
  },
  java: {
    name: "Java",
    filename: "BinarySearchTree.java",
    runtime: "OpenJDK 21 · 256 MB",
    icon: Code2,
    code: [
      "public class BinarySearchTree {",
      "    private Node root;",
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
      { code: "AC", label: "Test 01 · Accepted", detail: "Balanced lookup across 1,000 keys (38 ms)" },
      { code: "AC", label: "Test 02 · Accepted", detail: "Boundary miss on empty subtree (14 ms)" },
      { code: "AC", label: "Demo verdict · 2/2 passed", detail: "Simulated preview · real code runs in workspace" },
    ],
  },
  cpp: {
    name: "C++",
    filename: "fast_matrix.cpp",
    runtime: "GCC 13 C++20 · 256 MB",
    icon: Cpu,
    code: [
      "#include <utility>",
      "#include <vector>",
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
      { code: "AC", label: "Test 01 · Accepted", detail: "4x4 in-place matrix transpose (3 ms)" },
      { code: "AC", label: "Test 02 · Accepted", detail: "512x512 cache-aligned swap (11 ms)" },
      { code: "AC", label: "Demo verdict · 2/2 passed", detail: "Simulated preview · real code runs in workspace" },
    ],
  },
  c: {
    name: "C",
    filename: "ring_buffer.c",
    runtime: "GCC 13 C17 · 128 MB",
    icon: FileCode2,
    code: [
      "#include <stddef.h>",
      "",
      "size_t next_slot(size_t head, size_t cap) {",
      "    if (cap == 0) {",
      "        return 0;",
      "    }",
      "    return (head + 1) % cap;",
      "}",
    ],
    demoOutput: [
      { code: "AC", label: "Test 01 · Accepted", detail: "Wraparound at capacity boundary (2 ms)" },
      { code: "AC", label: "Test 02 · Accepted", detail: "Zero-capacity guard returns 0 (2 ms)" },
      { code: "AC", label: "Demo verdict · 2/2 passed", detail: "Simulated preview · real code runs in workspace" },
    ],
  },
};

function formatCodeLine(line: string) {
  const trimmed = line.trimStart();
  if (!trimmed) return <span>&nbsp;</span>;
  if (trimmed.startsWith("#include")) {
    return <span className="text-[var(--color-primary-text)]">{line}</span>;
  }
  if (
    trimmed.startsWith("def ") ||
    trimmed.startsWith("public class ") ||
    trimmed.startsWith("public boolean ") ||
    trimmed.startsWith("void ") ||
    trimmed.startsWith("size_t ")
  ) {
    return <span className="font-semibold text-[var(--color-accent)]">{line}</span>;
  }
  if (
    trimmed.startsWith("return") ||
    trimmed.startsWith("for ") ||
    trimmed.startsWith("while ") ||
    trimmed.startsWith("if ") ||
    trimmed.startsWith("assert ")
  ) {
    return <span className="text-[var(--color-primary-text)]">{line}</span>;
  }
  return <span className="text-[var(--color-text-main)]">{line}</span>;
}

export function PixelTerminal() {
  const [activeLang, setActiveLang] = useState<LanguageKey>("python");
  const [isRunning, setIsRunning] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tabRefs = useRef<Record<LanguageKey, HTMLButtonElement | null>>({
    python: null,
    java: null,
    cpp: null,
    c: null,
  });

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
    }, 550);
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

  const handleTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex = index;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % LANGUAGE_ORDER.length;
    else if (event.key === "ArrowLeft") nextIndex = (index - 1 + LANGUAGE_ORDER.length) % LANGUAGE_ORDER.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = LANGUAGE_ORDER.length - 1;
    else return;

    event.preventDefault();
    const nextKey = LANGUAGE_ORDER[nextIndex];
    handleSelectLang(nextKey);
    tabRefs.current[nextKey]?.focus();
  };

  return (
    <div className="skeuo-panel relative w-full min-w-0 overflow-hidden p-3.5 sm:p-5">
      {/* Machined Hardware Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span aria-hidden="true" className="skeuo-screw" />
          <span className="skeuo-key inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-elevated)] px-2.5 py-1 text-xs font-semibold text-[var(--color-text-main)]">
            <ShieldCheck size={14} aria-hidden="true" className="text-[var(--color-primary-text)]" />
            Sandbox deck
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="skeuo-well inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-code text-xs text-[var(--color-primary-text)]">
            Demo · workspace runs in isolate
          </span>
          <span aria-hidden="true" className="skeuo-screw" />
        </div>
      </div>

      {/* Physical Language Keycap Tray */}
      <div
        role="tablist"
        aria-label="Sample languages"
        className="skeuo-recess grid grid-cols-2 gap-1.5 rounded-xl p-1.5 sm:grid-cols-4"
      >
        {LANGUAGE_ORDER.map((key, index) => {
          const isActive = activeLang === key;
          const snippet = SNIPPETS[key];
          return (
            <Button
              key={key}
              ref={(el) => {
                tabRefs.current[key] = el;
              }}
              type="button"
              variant="outline"
              size="sm"
              role="tab"
              id={`demo-tab-${key}`}
              aria-selected={isActive}
              aria-controls={`demo-panel-${key}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => handleSelectLang(key)}
              onKeyDown={(e) => handleTabKeyDown(e, index)}
              className="skeuo-switch h-9 w-full justify-center gap-1.5 rounded-lg px-2.5 text-xs font-medium"
            >
              <snippet.icon
                size={14}
                aria-hidden="true"
                className={isActive ? "text-[var(--color-primary-text)]" : "text-[var(--color-text-muted)]"}
              />
              <span className="truncate">{snippet.name}</span>
            </Button>
          );
        })}
      </div>

      {/* Recessed Code Display Well */}
      <div
        role="tabpanel"
        id={`demo-panel-${activeLang}`}
        aria-labelledby={`demo-tab-${activeLang}`}
        className="skeuo-well mt-3.5 overflow-hidden rounded-xl border"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] bg-[var(--color-canvas)]/70 px-3.5 py-2 text-xs">
          <span className="font-code font-medium text-[var(--color-text-main)]">{current.filename}</span>
          <span className="font-code text-[var(--color-text-muted)]">{current.runtime}</span>
        </div>

        <div className="overflow-x-auto p-3.5 sm:p-4 font-code text-xs sm:text-sm">
          <div key={activeLang} className="min-h-[19rem] min-w-0 space-y-1">
            {current.code.map((line, i) => (
              <div
                key={i}
                style={{ "--row-i": i } as React.CSSProperties}
                className="skeuo-code-row grid grid-cols-[2rem_minmax(0,1fr)] items-baseline gap-3 leading-6"
              >
                <span
                  aria-hidden="true"
                  className="select-none rounded bg-[var(--color-elevated)]/70 px-1.5 py-0.5 text-center font-code text-xs leading-4 text-[var(--color-text-muted)]"
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="whitespace-pre">{formatCodeLine(line)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Machined Control Bar & Recessed Verdict Bay */}
      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" onClick={handleRunDemo} disabled={isRunning}>
            <CirclePlay size={14} aria-hidden="true" />
            {isRunning ? "Simulating…" : "Run demo"}
          </Button>

          {hasRun && (
            <Button type="button" variant="outline" size="sm" onClick={handleReset} title="Reset simulation">
              <ArrowLeft size={14} aria-hidden="true" />
              Reset
            </Button>
          )}
        </div>

        <span className="font-code text-xs text-[var(--color-text-muted)]">
          {hasRun ? "Verdict · AC Accepted" : "Ready · 2 hidden tests"}
        </span>
      </div>

      <div
        role="status"
        aria-live="polite"
        className="skeuo-well mt-3 min-h-[144px] rounded-xl border p-3 font-code text-xs text-[var(--color-text-muted)]"
      >
        {isRunning ? (
          <BrandLoader label={`Running preview for ${current.name}…`} height={20} className="justify-start py-2" />
        ) : hasRun ? (
          <div className="space-y-1.5">
            {current.demoOutput.map((item, idx) => (
              <div
                key={idx}
                style={{ "--row-i": idx } as React.CSSProperties}
                className="skeuo-verdict-row flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]/80 px-2.5 py-1.5"
              >
                <span className="inline-flex min-w-0 items-center gap-2 font-medium text-[var(--color-mint)]">
                  <CheckCircle2 size={14} aria-hidden="true" className="shrink-0 text-[var(--color-mint)]" />
                  <span>{item.code}</span>
                  <span className="text-[var(--color-text-main)]">{item.label}</span>
                </span>
                <span className="text-[var(--color-text-muted)]">{item.detail}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2 py-2 text-[var(--color-text-muted)]">
            <span>Press &quot;Run demo&quot; to preview how sandbox test verdicts settle into the deck.</span>
          </div>
        )}
      </div>

      <div aria-hidden="true" className="mt-3 flex items-center justify-between">
        <span className="skeuo-screw" />
        <span className="skeuo-screw" />
      </div>
    </div>
  );
}
