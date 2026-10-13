"use client";

import React, { useState } from "react";
import { PixelBadge } from "@/components/retro/pixel-badge";
import { DotIcon, type DotIconName } from "@/components/retro/dot-icon";
import { RotateCcw, AlertTriangle } from "lucide-react";

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
    <div className="relative w-full rounded-none border-2 border-[#9E00FF] bg-[#120A24] pixel-box-purple overflow-hidden">
      {/* Decorative corner tabs */}
      <div className="absolute top-0 left-0 w-3 h-3 bg-[#00F0FF] z-20" />
      <div className="absolute top-0 right-0 w-3 h-3 bg-[#00F0FF] z-20" />
      <div className="absolute bottom-0 left-0 w-3 h-3 bg-[#FF007A] z-20" />
      <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#FF007A] z-20" />

      {/* Terminal Title Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-4 py-2.5 bg-[#1B0F36] border-b-2 border-[#2E1A57] font-mono text-xs">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-[#FF007A] inline-block border border-black/60" />
            <span className="w-2.5 h-2.5 bg-[#00F0FF] inline-block border border-black/60" />
            <span className="w-2.5 h-2.5 bg-[#00FF9D] inline-block border border-black/60" />
          </div>
          <span className="text-white font-bold ml-1 tracking-wider">
            exeku-terminal<span className="text-[#00F0FF]">_mock</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[#A79EC4] hidden sm:inline">[HOST: 127.0.0.1]</span>
          <PixelBadge variant="cyan">DEV PREVIEW</PixelBadge>
        </div>
      </div>

      {/* Disclaimer Banner: Strictly labeled as demo */}
      <div className="px-3 sm:px-4 py-1.5 bg-[#200B1A] border-b border-[#FF007A]/40 flex items-center justify-between gap-2 text-[11px] font-mono text-[#FF85C0]">
        <div className="flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-[#FF007A] shrink-0" />
          <span>DEMO SIMULATION ONLY — Local execution engine is in active development on the roadmap.</span>
        </div>
        <span className="hidden md:inline text-[10px] uppercase opacity-75">Not a live compiler</span>
      </div>

      {/* Language Switcher Tabs with Doticons */}
      <div className="flex items-center border-b-2 border-[#2E1A57] bg-[#0E071D] px-2 sm:px-4 overflow-x-auto">
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
              className={`px-3 sm:px-4 py-2 text-xs font-mono font-medium tracking-wider flex items-center gap-2 border-b-2 transition-colors cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-[#00F0FF] ${
                isActive
                  ? "border-[#00F0FF] text-[#00F0FF] bg-[#1B0F36]"
                  : "border-transparent text-[#A79EC4] hover:text-white hover:bg-[#150B2C]"
              }`}
            >
              <DotIcon
                name={snippet.iconName}
                size={14}
                className={isActive ? "text-[#00F0FF]" : "text-[#A79EC4]"}
              />
              <span>{snippet.name}</span>
              <span className="text-[10px] text-[#6D628B]">({snippet.filename})</span>
            </button>
          );
        })}
      </div>

      {/* Code Editor Body Viewport */}
      <div className="relative p-3 sm:p-5 bg-[#090514] font-mono text-xs sm:text-sm overflow-x-auto min-h-[220px]">
        {/* Subtle Scanlines Overlay */}
        <div className="absolute inset-0 scanlines pointer-events-none opacity-40" />

        <div className="relative z-10 flex">
          {/* Line Numbers */}
          <div className="select-none text-[#4A3D6B] pr-4 text-right border-r border-[#2E1A57]/60 font-mono text-xs sm:text-sm leading-6">
            {current.code.map((_, i) => (
              <div key={i}>{String(i + 1).padStart(2, "0")}</div>
            ))}
          </div>

          {/* Code Lines */}
          <div className="pl-4 font-mono text-xs sm:text-sm leading-6 text-[#E4DBFF] flex-1">
            {current.code.map((line, i) => (
              <div key={i} className="whitespace-pre">
                {line.startsWith("#") || line.startsWith("//") ? (
                  <span className="text-[#6D628B] italic">{line}</span>
                ) : line.includes("def ") || line.includes("void ") || line.includes("public class ") ? (
                  <span className="text-[#00F0FF] font-semibold">{line}</span>
                ) : line.includes("return") || line.includes("for ") || line.includes("while ") ? (
                  <span className="text-[#FF007A]">{line}</span>
                ) : (
                  <span>{line}</span>
                )}
              </div>
            ))}
            <div className="text-[#00F0FF] inline-block animate-terminal-blink">█</div>
          </div>
        </div>
      </div>

      {/* Action Strip & Simulated Terminal Output */}
      <div className="p-3 sm:p-4 bg-[#140C27] border-t-2 border-[#2E1A57]">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRunDemo}
              disabled={isRunning}
              className="px-4 py-2 bg-[#00F0FF] hover:bg-[#38BDF8] text-[#090514] font-mono font-bold text-xs uppercase flex items-center gap-1.5 transition-all shadow-[2px_2px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] cursor-pointer disabled:opacity-50"
            >
              <DotIcon name="circlePlay" size={14} className="text-[#090514]" />
              {isRunning ? "Simulating..." : "Run Demo ▶"}
            </button>

            {hasRun && (
              <button
                type="button"
                onClick={handleReset}
                className="px-3 py-2 bg-[#1B0F36] hover:bg-[#2E1A57] text-[#A79EC4] hover:text-white font-mono text-xs uppercase flex items-center gap-1 border border-[#2E1A57] cursor-pointer"
                title="Reset simulation"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            )}
          </div>

          <div className="text-[11px] font-mono text-[#A79EC4] flex items-center gap-2">
            <DotIcon name="windows" size={13} className="text-[#00FF9D]" />
            <span>Target Architecture: Windows x64</span>
          </div>
        </div>

        {/* Output Console Box */}
        <div className="p-2.5 sm:p-3 bg-[#0B0617] border border-[#2E1A57] font-mono text-xs text-[#A79EC4] min-h-[72px]">
          {isRunning ? (
            <div className="text-[#00F0FF] animate-pulse flex items-center gap-2">
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
                      ? "text-[#00FF9D]"
                      : "text-[#C084FC]"
                  }`}
                >
                  {outLine.includes("✓") && (
                    <DotIcon name="circleCheck" size={14} className="text-[#00FF9D] mt-0.5 shrink-0" />
                  )}
                  <span>{outLine}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[#6D628B] italic">
              Click &quot;Run Demo ▶&quot; to simulate how local tests will run on your machine once the execution engine is released.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
