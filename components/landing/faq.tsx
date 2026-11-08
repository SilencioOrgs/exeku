"use client";

import React, { useState } from "react";
import { DotIcon } from "@/components/retro/dot-icon";

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: "Do I need to install anything?",
      a: "No. Exeku runs in your browser. Open the site, create a profile and start solving.",
    },
    {
      q: "Do I need an account?",
      a: "Not right now. Your profile, settings and code drafts are saved in your browser, so there is no sign-up form. Clearing your browser data removes them.",
    },
    {
      q: "Which languages can I use?",
      a: "Python 3, Java, C++ and C. You can switch per problem, and Exeku keeps a draft for each language.",
    },
    {
      q: "How is my code run and graded?",
      a: "Every run happens in an isolated sandbox with time and memory limits, never on your computer. Submissions are judged against visible and hidden tests, with a verdict like Accepted or Wrong answer. If the judge is unavailable, Exeku says so instead of faking results.",
    },
    {
      q: "What is Exeku Lab?",
      a: "A separate desktop and mobile app for Arduino and microcontroller projects, coming soon. This website is for competitive programming.",
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
            <p className="font-code text-xs font-medium text-[var(--color-primary-text)]">FAQ</p>
          </div>
          <h2
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-[var(--color-text-main)] mb-4 tracking-tight"
            style={{ fontFamily: "var(--font-heading-active)" }}
          >
            Frequently Asked Questions.
          </h2>
          <p className="text-base sm:text-lg text-[var(--color-text-muted)] font-sans">
            Clear, honest answers about how Exeku works and what it needs.
          </p>
        </div>

        {/* Accordion List */}
        <div className="space-y-4">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="border border-[var(--color-border)] bg-[var(--color-surface)] transition-colors"
              >
                <button
                  type="button"
                  onClick={() => toggle(idx)}
                  className="w-full p-4 sm:p-5 flex items-center justify-between text-left gap-4 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
                  aria-expanded={isOpen}
                >
                  <span className="text-base font-semibold text-[var(--color-text-main)] sm:text-lg">
                    {faq.q}
                  </span>
                  <div className="p-1 bg-[var(--color-elevated)] border border-[var(--color-border)] text-[var(--color-accent)] shrink-0">
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
