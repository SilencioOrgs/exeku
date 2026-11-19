"use client";

import React, { useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollReveal } from "./scroll-reveal";

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
    <section id="faq" className="relative border-t border-b border-[var(--color-border)] bg-[var(--color-canvas)] py-20 md:py-28">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <ScrollReveal variant="copy" className="mx-auto mb-14 max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-[var(--color-text-main)] sm:text-4xl md:text-5xl">
            Frequently asked questions.
          </h2>
          <p className="text-base text-[var(--color-text-muted)] sm:text-lg">
            Clear, honest answers about how Exeku works and what it needs.
          </p>
        </ScrollReveal>

        <div className="space-y-4">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            const panelId = `faq-panel-${idx}`;
            return (
              <ScrollReveal
                key={faq.q}
                variant="panel"
                delayMs={idx * 55}
                className="skeuo-panel overflow-hidden"
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
                  <span
                    aria-hidden="true"
                    className="skeuo-key grid size-8 shrink-0 place-items-center rounded-lg bg-[var(--color-elevated)] text-[var(--color-primary-text)]"
                  >
                    {isOpen ? <ArrowUp size={15} /> : <ArrowDown size={15} />}
                  </span>
                </Button>

                {isOpen && (
                  <div
                    id={panelId}
                    className="skeuo-well mx-3 mb-3 rounded-xl border p-4 text-sm leading-relaxed text-[var(--color-text-muted)] sm:mx-4 sm:mb-4 sm:p-5 sm:text-base"
                  >
                    {faq.a}
                  </div>
                )}
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
