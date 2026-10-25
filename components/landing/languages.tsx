import React from "react";
import { PixelBadge } from "@/components/retro/pixel-badge";
import { PixelCard } from "@/components/retro/pixel-card";
import { DotIcon, type DotIconName } from "@/components/retro/dot-icon";

export function Languages() {
  const languages: Array<{
    id: string;
    name: string;
    role: string;
    accentBorder: string;
    accentText: string;
    badgeVariant: "cyan" | "default" | "purple" | "pink";
    iconName: DotIconName;
    runtimeNote: string;
    curriculum: string[];
    sample: string;
  }> = [
    {
      id: "python",
      name: "Python 3",
      role: "Fundamentals & Logic",
      accentBorder: "border-[var(--color-accent)]/50",
      accentText: "text-[var(--color-text-main)]",
      badgeVariant: "cyan",
      iconName: "python",
      runtimeNote: "Interpreted • Python 3 Runtime Target",
      curriculum: ["Syntax & Control Flow", "Functions & Recursion", "Algorithm Foundations"],
      sample: "def bubble_sort(arr):\n    n = len(arr)\n    for i in range(n):\n        for j in range(0, n-i-1):\n            if arr[j] > arr[j+1]:\n                arr[j], arr[j+1] = arr[j+1], arr[j]",
    },
    {
      id: "java",
      name: "Java",
      role: "Object-Oriented Architecture",
      accentBorder: "border-[var(--color-warning)]/50",
      accentText: "text-[var(--color-text-muted)]",
      badgeVariant: "default",
      iconName: "java",
      runtimeNote: "Bytecode • OpenJDK Target",
      curriculum: ["Classes & Polymorphism", "Collections Framework", "Design Patterns"],
      sample: "public class Node<T> {\n    T data;\n    Node<T> next;\n    public Node(T data) {\n        this.data = data;\n        this.next = null;\n    }\n}",
    },
    {
      id: "cpp",
      name: "C++",
      role: "Systems & Performance",
      accentBorder: "border-[var(--color-primary)]/50",
      accentText: "text-[var(--color-text-main)]",
      badgeVariant: "purple",
      iconName: "cplusplus",
      runtimeNote: "Compiled • GCC / Clang Target",
      curriculum: ["Pointers & References", "RAII & Smart Pointers", "Templates & Modern C++"],
      sample: "template <typename T>\nvoid quick_sort(std::vector<T>& vec, int low, int high) {\n    if (low < high) {\n        int pi = partition(vec, low, high);\n        quick_sort(vec, low, pi - 1);\n        quick_sort(vec, pi + 1, high);\n    }\n}",
    },
    {
      id: "c",
      name: "C",
      role: "Bare Metal & Foundations",
      accentBorder: "border-[var(--color-pink)]/50",
      accentText: "text-[var(--color-text-muted)]",
      badgeVariant: "pink",
      iconName: "file",
      runtimeNote: "Native • C11 / C17 Target",
      curriculum: ["Manual Memory Management", "Structs & Memory Layout", "Bitwise Operations"],
      sample: "int* allocate_array(size_t size) {\n    int* ptr = (int*)malloc(size * sizeof(int));\n    if (ptr == NULL) {\n        return NULL;\n    }\n    return ptr;\n}",
    },
  ];

  return (
    <section id="languages" className="py-20 md:py-28 bg-[var(--color-canvas)] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mb-14">
          <div className="mb-3">
            <PixelBadge variant="cyan">CORE CURRICULUM</PixelBadge>
          </div>
          <h2
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-[var(--color-text-main)] mb-6 tracking-tight"
            style={{ fontFamily: "var(--font-heading-active)" }}
          >
            Four Foundational Languages.
          </h2>
          <p className="text-base sm:text-lg text-[var(--color-text-muted)] font-sans leading-relaxed">
            Exeku focuses deeply on the languages that form the backbone of computer
            science education. From high-level algorithmic logic to bare-metal memory
            allocation, students build real fluency across the software stack.
          </p>
        </div>

        {/* 4 Languages Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {languages.map((lang) => (
            <PixelCard
              key={lang.id}
              variant="default"
              className={`bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl transition-all`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[var(--color-elevated)] rounded-lg border border-[var(--color-border)] flex items-center justify-center">
                    <DotIcon name={lang.iconName} size={22} className="text-[var(--color-text-muted)]" />
                  </div>
                  <div>
                    <h3
                      className="text-2xl font-bold text-[var(--color-text-main)] tracking-wider"
                      style={{ fontFamily: "var(--font-heading-active)" }}
                    >
                      {lang.name}
                    </h3>
                    <span className="text-xs font-mono text-[var(--color-text-muted)]">{lang.role}</span>
                  </div>
                </div>
                <PixelBadge variant={lang.badgeVariant}>{lang.runtimeNote}</PixelBadge>
              </div>

              {/* Planned Curriculum Tracks */}
              <div className="mb-4 pt-3 border-t border-[var(--color-border)]">
                <span className="text-xs font-mono text-[var(--color-text-muted)] uppercase tracking-wider block mb-2">
                  Planned Curriculum Modules:
                </span>
                <div className="flex flex-wrap gap-2">
                  {lang.curriculum.map((item, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 text-xs font-mono bg-[var(--color-elevated)] border border-[var(--color-border)] text-[var(--color-text-main)]"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              {/* Code Snippet Box */}
              <div className="p-3 bg-[var(--color-canvas)] border border-[var(--color-border)] font-mono text-xs text-[var(--color-text-muted)] overflow-x-auto">
                <pre className="text-[0.75rem] leading-5 text-[var(--color-text-main)] whitespace-pre">
                  {lang.sample}
                </pre>
              </div>
            </PixelCard>
          ))}
        </div>
      </div>
    </section>
  );
}
