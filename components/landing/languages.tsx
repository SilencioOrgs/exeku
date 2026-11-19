import React from "react";
import { Code2, Cpu, FileCode2, type LucideIcon } from "lucide-react";
import { ScrollReveal } from "./scroll-reveal";

function formatSampleLine(line: string) {
  const trimmed = line.trimStart();
  if (!trimmed) return <span>&nbsp;</span>;
  if (
    trimmed.startsWith("def ") ||
    trimmed.startsWith("public class ") ||
    trimmed.startsWith("public Node") ||
    trimmed.startsWith("template ") ||
    trimmed.startsWith("void ") ||
    trimmed.startsWith("int* ")
  ) {
    return <span className="font-semibold text-[var(--color-accent)]">{line}</span>;
  }
  if (
    trimmed.startsWith("for ") ||
    trimmed.startsWith("if ") ||
    trimmed.startsWith("return ")
  ) {
    return <span className="text-[var(--color-primary-text)]">{line}</span>;
  }
  return <span className="text-[var(--color-text-main)]">{line}</span>;
}

export function Languages() {
  const languages: Array<{
    id: string;
    name: string;
    role: string;
    filename: string;
    accentText: string;
    icon: LucideIcon;
    runtimeNote: string;
    curriculum: string[];
    sample: string;
  }> = [
    {
      id: "python",
      name: "Python 3",
      role: "Fundamentals & logic",
      filename: "bubble_sort.py",
      accentText: "text-[var(--color-accent)]",
      icon: Code2,
      runtimeNote: "Interpreted · Python 3",
      curriculum: ["Syntax & Control Flow", "Functions & Recursion", "Algorithm Foundations"],
      sample:
        "def bubble_sort(arr):\n    n = len(arr)\n    for i in range(n):\n        for j in range(0, n-i-1):\n            if arr[j] > arr[j+1]:\n                arr[j], arr[j+1] = arr[j+1], arr[j]",
    },
    {
      id: "java",
      name: "Java",
      role: "Object-oriented architecture",
      filename: "Node.java",
      accentText: "text-[var(--color-warning)]",
      icon: Code2,
      runtimeNote: "Bytecode · OpenJDK",
      curriculum: ["Classes & Polymorphism", "Collections Framework", "Design Patterns"],
      sample:
        "public class Node<T> {\n    T data;\n    Node<T> next;\n    public Node(T data) {\n        this.data = data;\n        this.next = null;\n    }\n}",
    },
    {
      id: "cpp",
      name: "C++",
      role: "Systems & performance",
      filename: "quick_sort.cpp",
      accentText: "text-[var(--color-primary-text)]",
      icon: Cpu,
      runtimeNote: "Compiled · GCC / Clang",
      curriculum: ["Pointers & References", "RAII & Smart Pointers", "Templates & Modern C++"],
      sample:
        "template <typename T>\nvoid quick_sort(std::vector<T>& vec, int low, int high) {\n    if (low < high) {\n        int pi = partition(vec, low, high);\n        quick_sort(vec, low, pi - 1);\n        quick_sort(vec, pi + 1, high);\n    }\n}",
    },
    {
      id: "c",
      name: "C",
      role: "Bare metal & foundations",
      filename: "alloc.c",
      accentText: "text-[var(--color-primary-text)]",
      icon: FileCode2,
      runtimeNote: "Native · C11 / C17",
      curriculum: ["Manual Memory Management", "Structs & Memory Layout", "Bitwise Operations"],
      sample:
        "int* allocate_array(size_t size) {\n    int* ptr = (int*)malloc(size * sizeof(int));\n    if (ptr == NULL) {\n        return NULL;\n    }\n    return ptr;\n}",
    },
  ];

  return (
    <section id="languages" className="relative bg-[var(--color-canvas)] py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <ScrollReveal variant="copy" className="mb-14 max-w-3xl">
          <h2 className="mb-6 text-3xl font-bold tracking-tight text-[var(--color-text-main)] sm:text-4xl md:text-5xl">
            Four foundational languages.
          </h2>
          <p className="text-base leading-relaxed text-[var(--color-text-muted)] sm:text-lg">
            Exeku focuses deeply on the languages that form the backbone of computer
            science education. From high-level algorithmic logic to bare-metal memory
            allocation, students build real fluency across the software stack.
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:gap-8">
          {languages.map((lang, index) => {
            const lines = lang.sample.split("\n");
            return (
              <ScrollReveal
                key={lang.id}
                variant="panel"
                delayMs={index * 70}
                className="skeuo-panel flex flex-col p-5 sm:p-6"
              >
                <div>
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="skeuo-key flex size-11 shrink-0 items-center justify-center rounded-xl bg-[var(--color-elevated)]">
                        <lang.icon size={20} aria-hidden="true" className={lang.accentText} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate text-2xl font-bold text-[var(--color-text-main)]">
                          {lang.name}
                        </h3>
                        <span className="block text-xs text-[var(--color-text-muted)]">{lang.role}</span>
                      </div>
                    </div>
                    <span className="skeuo-well inline-flex items-center rounded-lg border px-2.5 py-1 font-code text-xs text-[var(--color-primary-text)]">
                      {lang.runtimeNote}
                    </span>
                  </div>

                  {/* Tactile Curriculum Keycap Tray */}
                  <div className="skeuo-recess mb-4 rounded-xl p-2.5">
                    <span className="mb-2 block text-xs text-[var(--color-text-muted)]">
                      Curriculum tracks
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {lang.curriculum.map((item) => (
                        <span
                          key={item}
                          className="skeuo-key rounded-lg bg-[var(--color-elevated)] px-2.5 py-1 text-xs font-medium text-[var(--color-text-main)]"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Recessed Skeuomorphic Code Well */}
                <div className="skeuo-well flex-1 overflow-hidden rounded-xl border">
                  <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border)] bg-[var(--color-canvas)]/70 px-3 py-1.5 font-code text-xs">
                    <span className="text-[var(--color-text-main)]">{lang.filename}</span>
                    <span aria-hidden="true" className="skeuo-screw" />
                  </div>
                  <div className="overflow-x-auto p-3 font-code text-xs">
                    <div className="space-y-1">
                      {lines.map((line, i) => (
                        <div key={i} className="grid grid-cols-[1.75rem_minmax(0,1fr)] items-baseline gap-2.5 leading-5">
                          <span
                            aria-hidden="true"
                            className="select-none rounded bg-[var(--color-elevated)]/70 px-1 py-0.5 text-center font-code text-xs leading-4 text-[var(--color-text-muted)]"
                          >
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <div className="whitespace-pre">{formatSampleLine(line)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
