"use client";

import React, { useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: "Do I need to install anything?",
      a: "No. Exeku runs in your browser. Sign in with Google, finish setup, and start solving.",
    },
    {
      q: "How does my account work?",
      a: "Sign in with Google on the setup page to join leaderboards, organizations, and campus tournaments. Your unsubmitted code drafts and appearance settings stay saved locally in your browser.",
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
            Frequently asked questions.
          </h2>
          <p className="text-base sm:text-lg text-[var(--color-text-muted)]">
            Clear, honest answers about how Exeku works and what it needs.
          </p>
        </div>

        {/* Accordion List */}
        <div className="space-y-4">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            const panelId = `faq-panel-${idx}`;
            return (
              <div
                key={idx}
                className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] transition-colors"
              >
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => toggle(idx)}
                  className="h-auto w-full justify-between gap-4 rounded-none p-4 text-left whitespace-normal sm:p-5"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                >
                  <span className="text-base font-semibold text-[var(--color-text-main)] sm:text-lg">
                    {faq.q}
                  </span>
                  <span aria-hidden="true" className="shrink-0 rounded-md border border-[var(--color-border)] bg-[var(--color-elevated)] p-1 text-[var(--color-accent)]">
                    {isOpen ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                  </span>
                </Button>

                {isOpen && (
                  <div id={panelId} className="px-4 pb-5 sm:px-5 sm:pb-6 pt-3 text-sm sm:text-base text-[var(--color-text-muted)] border-t border-[var(--color-elevated)] leading-relaxed">
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
