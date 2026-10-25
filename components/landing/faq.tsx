"use client";

import React, { useState } from "react";
import { PixelBadge } from "@/components/retro/pixel-badge";
import { DotIcon } from "@/components/retro/dot-icon";

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: "Does Exeku require internet connectivity to run?",
      a: "No. Once cloned and dependencies installed, Exeku is engineered to run offline. All styles, fonts, and editor interfaces are bundled locally. The upcoming execution engine and grading modules will compile and evaluate code 100% on your machine without external API calls.",
    },
    {
      q: "Do students or teachers need to create a cloud account?",
      a: "No. Exeku enforces zero cloud lock-in. There are no registration forms, external authentication servers, or telemetry databases. Student data and learning progress will reside solely on the local computer.",
    },
    {
      q: "Is Exeku supported on macOS or Linux?",
      a: "Exeku is currently targeted specifically for Windows (Windows 10/11) to address the primary operating system used in educational computer labs and institutional workstations. Cross-platform support will be evaluated in future milestones.",
    },
    {
      q: "When will the local code execution engine and auto-grader be released?",
      a: "The execution engine and automated grading system are actively in development on our roadmap. The current release is a developer preview delivering the offline Next.js platform shell, Monaco editor foundation, and curriculum scaffolding.",
    },
    {
      q: "Can schools deploy Exeku on air-gapped lab computers?",
      a: "Yes. Once the project source is cloned and bundled, it can be distributed across local lab computers or offline drives without needing any external network connection or proxy configuration.",
    },
  ];

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section id="faq" className="py-20 md:py-28 bg-[var(--color-canvas)] border-t border-b border-[var(--color-border)] relative">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="mb-3">
            <PixelBadge variant="purple">KNOWLEDGE BASE</PixelBadge>
          </div>
          <h2
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-[var(--color-text-main)] mb-4 tracking-tight"
            style={{ fontFamily: "var(--font-heading-active)" }}
          >
            Frequently Asked Questions.
          </h2>
          <p className="text-base sm:text-lg text-[var(--color-text-muted)] font-sans">
            Clear, honest answers about our offline architecture, roadmap, and requirements.
          </p>
        </div>

        {/* Accordion List */}
        <div className="space-y-4">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] transition-colors"
              >
                <button
                  type="button"
                  onClick={() => toggle(idx)}
                  className="w-full p-4 sm:p-5 flex items-center justify-between text-left gap-4 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
                  aria-expanded={isOpen}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[var(--color-text-muted)] text-xs font-medium shrink-0 flex items-center gap-1.5">
                      <DotIcon name="chat" size={14} className="text-[var(--color-text-muted)]" />
                      [Q-0{idx + 1}]
                    </span>
                    <span className="text-base sm:text-lg font-bold text-[var(--color-text-main)] font-sans">
                      {faq.q}
                    </span>
                  </div>
                  <div className="rounded-lg p-1 bg-[var(--color-elevated)] border border-[var(--color-border)] text-[var(--color-text-muted)] shrink-0">
                    {isOpen ? <DotIcon name="arrowUp" className="w-4 h-4" /> : <DotIcon name="arrowDown" className="w-4 h-4" />}
                  </div>
                </button>

                {isOpen && (
                  <div className="px-4 pb-5 sm:px-5 sm:pb-6 pt-1 text-sm sm:text-base text-[var(--color-text-muted)] font-sans border-t border-[var(--color-elevated)] leading-relaxed">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
