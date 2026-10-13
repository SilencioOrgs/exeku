"use client";

import React, { useState } from "react";
import { PixelBadge } from "@/components/retro/pixel-badge";
import { ChevronDown, ChevronUp } from "lucide-react";

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
    <section id="faq" className="py-20 md:py-28 bg-[#0B0617] border-t-2 border-b-2 border-[#2E1A57] relative">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="mb-3">
            <PixelBadge variant="purple">KNOWLEDGE BASE</PixelBadge>
          </div>
          <h2
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 uppercase tracking-tight"
            style={{ fontFamily: "var(--font-pixelify)" }}
          >
            Frequently Asked Questions.
          </h2>
          <p className="text-base sm:text-lg text-[#A79EC4] font-sans">
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
                className="border-2 border-[#2E1A57] bg-[#120A24] transition-colors"
              >
                <button
                  type="button"
                  onClick={() => toggle(idx)}
                  className="w-full p-4 sm:p-5 flex items-center justify-between text-left gap-4 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]"
                  aria-expanded={isOpen}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[#00F0FF] font-mono text-xs font-bold shrink-0">
                      [Q-0{idx + 1}]
                    </span>
                    <span className="text-base sm:text-lg font-bold text-white font-mono">
                      {faq.q}
                    </span>
                  </div>
                  <div className="p-1 bg-[#1B0F36] border border-[#2E1A57] text-[#00F0FF] shrink-0">
                    {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </button>

                {isOpen && (
                  <div className="px-4 pb-5 sm:px-5 sm:pb-6 pt-1 text-sm sm:text-base text-[#A79EC4] font-sans border-t border-[#1B0F36] leading-relaxed">
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
