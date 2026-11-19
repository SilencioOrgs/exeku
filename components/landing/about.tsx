import React from "react";
import { CirclePlay, Code2, Shield, type LucideIcon } from "lucide-react";
import { ScrollReveal } from "./scroll-reveal";

export function About() {
  const pillars: Array<{
    icon: LucideIcon;
    iconColor: string;
    title: string;
    tag: string;
    spec: string;
    description: string;
  }> = [
    {
      icon: Shield,
      iconColor: "text-[var(--color-primary-text)]",
      title: "Isolated sandboxing",
      tag: "Secure runtime",
      spec: "isolate v2 · air-gapped",
      description:
        "Untrusted code runs inside ephemeral, resource-constrained sandbox containers. Memory limits, CPU quotas, and air-gapped process isolation keep runaway loops and unsafe code contained.",
    },
    {
      icon: CirclePlay,
      iconColor: "text-[var(--color-accent)]",
      title: "Automated assessment",
      tag: "Instant verdicts",
      spec: "AC · WA · TLE · MLE",
      description:
        "Deterministic test suite verification with instant grading. Visible test cases provide actionable debugging feedback, while hidden test cases ensure algorithmic rigor and prevent hardcoded answers.",
    },
    {
      icon: Code2,
      iconColor: "text-[var(--color-primary-text)]",
      title: "Runs in the browser",
      tag: "Nothing to install",
      spec: "IndexedDB + cloud sync",
      description:
        "Sign in with Google and start coding right away. Unsubmitted drafts and editor preferences stay saved in your browser while submissions sync to your campus and global standings.",
    },
  ];

  return (
    <section id="about" className="relative border-t border-b border-[var(--color-border)] bg-[var(--color-canvas)] py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <ScrollReveal variant="copy" className="mb-14 max-w-3xl">
          <h2 className="mb-6 text-3xl font-bold tracking-tight text-[var(--color-text-main)] sm:text-4xl md:text-5xl">
            Code. Practice. Compete.
          </h2>
          <p className="text-base leading-relaxed text-[var(--color-text-muted)] sm:text-lg">
            Exeku is an online programming practice and assessment platform for students.
            It combines instant automated judging, four languages and competitive programming workflows, right in
            your browser.
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 lg:gap-8">
          {pillars.map((pillar, index) => (
            <ScrollReveal
              key={pillar.title}
              variant="panel"
              delayMs={index * 80}
              className="skeuo-panel flex flex-col justify-between p-5 sm:p-6"
            >
              <div>
                <div className="mb-6 flex items-center justify-between gap-2">
                  <div className="skeuo-key flex size-12 shrink-0 items-center justify-center rounded-xl bg-[var(--color-elevated)]">
                    <pillar.icon size={22} aria-hidden="true" className={pillar.iconColor} />
                  </div>
                  <span className="skeuo-well inline-flex items-center rounded-lg border px-2.5 py-1 font-code text-xs text-[var(--color-primary-text)]">
                    {pillar.tag}
                  </span>
                </div>

                <h3 className="mb-3 text-xl font-bold text-[var(--color-text-main)] sm:text-2xl">
                  {pillar.title}
                </h3>

                <p className="text-sm leading-relaxed text-[var(--color-text-muted)] sm:text-base">
                  {pillar.description}
                </p>
              </div>

              <div className="skeuo-well mt-6 flex items-center justify-between rounded-xl border px-3 py-2 font-code text-xs text-[var(--color-text-muted)]">
                <span>Subsystem</span>
                <span className="text-[var(--color-text-main)]">{pillar.spec}</span>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
