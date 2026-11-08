import React from "react";
import { PixelBadge } from "@/components/retro/pixel-badge";
import { PixelCard } from "@/components/retro/pixel-card";
import { CirclePlay, Code2, Shield, type LucideIcon } from "lucide-react";

export function About() {
  const pillars: Array<{
    icon: LucideIcon;
    iconColor: string;
    title: string;
    tag: string;
    badgeVariant: "pink" | "cyan" | "mint";
    description: string;
  }> = [
    {
      icon: Shield,
      iconColor: "text-[var(--color-primary-text)]",
      title: "Isolated Sandboxing",
      tag: "Secure runtime",
      badgeVariant: "pink",
      description:
        "Untrusted code is executed inside ephemeral, resource-constrained sandbox containers. Memory limits, CPU quotas, and air-gapped process isolation keep runaway loops and unsafe code contained.",
    },
    {
      icon: CirclePlay,
      iconColor: "text-[var(--color-accent)]",
      title: "Automated Assessment",
      tag: "Instant verdicts",
      badgeVariant: "cyan",
      description:
        "Deterministic test suite verification with instant grading. Visible test cases provide actionable debugging feedback, while hidden test cases ensure algorithmic rigor and prevent hardcoded answers.",
    },
    {
      icon: Code2,
      iconColor: "text-[var(--color-primary-text)]",
      title: "Runs in the Browser",
      tag: "Nothing to install",
      badgeVariant: "mint",
      description:
        "Open the site and start coding. Your profile, settings and drafts are saved in your browser, with no forced sign-up and no third-party trackers.",
    },
  ];

  return (
    <section id="about" className="py-20 md:py-28 bg-[var(--color-canvas)] border-t border-b border-[var(--color-border)] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mb-14">
          <div className="mb-3">
            <p className="font-code text-xs font-medium text-[var(--color-primary-text)]">About</p>
          </div>
          <h2
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-[var(--color-text-main)] mb-6 tracking-tight"
            style={{ fontFamily: "var(--font-heading-active)" }}
          >
            Code. Practice. Compete.
          </h2>
          <p className="text-base sm:text-lg text-[var(--color-text-muted)] font-sans leading-relaxed">
            Exeku is an online programming practice and assessment platform for students.
            It combines instant automated judging, four languages and competitive programming workflows, right in
            your browser.
          </p>
        </div>

        {/* 3 Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {pillars.map((pillar) => (
            <PixelCard
              key={pillar.title}
              variant="default"
              className="bg-[var(--color-surface)] hover:border-[var(--color-primary)] transition-all group"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 bg-[var(--color-elevated)] border border-[var(--color-border)] group-hover:border-[var(--color-accent)] flex items-center justify-center transition-colors">
                  <pillar.icon size={24} className={pillar.iconColor} />
                </div>
                <PixelBadge variant={pillar.badgeVariant}>{pillar.tag}</PixelBadge>
              </div>

              <h3
                className="text-xl sm:text-2xl font-bold text-[var(--color-text-main)] mb-3"
                style={{ fontFamily: "var(--font-heading-active)" }}
              >
                {pillar.title}
              </h3>

              <p className="text-sm sm:text-base text-[var(--color-text-muted)] leading-relaxed">
                {pillar.description}
              </p>
            </PixelCard>
          ))}
        </div>

      </div>
    </section>
  );
}
