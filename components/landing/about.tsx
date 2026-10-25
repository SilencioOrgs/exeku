import React from "react";
import { PixelBadge } from "@/components/retro/pixel-badge";
import { PixelCard } from "@/components/retro/pixel-card";
import { DotIcon, type DotIconName } from "@/components/retro/dot-icon";

export function About() {
  const pillars: Array<{
    iconName: DotIconName;
    iconColor: string;
    title: string;
    tag: string;
    badgeVariant: "pink" | "cyan" | "mint";
    description: string;
  }> = [
    {
      iconName: "shield",
      iconColor: "text-[var(--color-pink)]",
      title: "Isolated Sandboxing",
      tag: "SECURE RUNTIME",
      badgeVariant: "pink",
      description:
        "Untrusted code is executed inside ephemeral, resource-constrained sandbox containers. Memory limits, CPU quotas, and air-gapped process isolation protect the host system from runaway loops and unsafe operations.",
    },
    {
      iconName: "circlePlay",
      iconColor: "text-[var(--color-accent)]",
      title: "Automated Assessment",
      tag: "CODECHUM MODEL",
      badgeVariant: "cyan",
      description:
        "Deterministic test suite verification with instant grading. Visible test cases provide actionable debugging feedback, while hidden test cases ensure algorithmic rigor and prevent hardcoded answers.",
    },
    {
      iconName: "windows",
      iconColor: "text-[var(--color-mint)]",
      title: "Local Developer Preview",
      tag: "ZERO LOCK-IN",
      badgeVariant: "mint",
      description:
        "During local developer preview, your profile, settings, and workspace operate directly in your browser and local developer environment without forced cloud logins, third-party trackers, or vendor lock-in.",
    },
  ];

  return (
    <section id="about" className="py-20 md:py-28 bg-[var(--color-canvas)] border-t-2 border-b-2 border-[var(--color-border)] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mb-14">
          <div className="mb-3">
            <PixelBadge variant="purple">ABOUT EXEKU</PixelBadge>
          </div>
          <h2
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-[var(--color-text-main)] mb-6 uppercase tracking-tight"
            style={{ fontFamily: "var(--font-heading-active)" }}
          >
            Code. Practice. Compete.
          </h2>
          <p className="text-base sm:text-lg text-[var(--color-text-muted)] font-sans leading-relaxed">
            Exeku is an online programming practice and assessment platform inspired by CodeChum,
            currently in local developer preview. We combine instant automated judging, multi-language sandboxes,
            and competitive programming workflows with a distinct retro developer aesthetic.
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
                <div className="w-12 h-12 bg-[var(--color-elevated)] border-2 border-[var(--color-border)] group-hover:border-[var(--color-accent)] flex items-center justify-center transition-colors [box-shadow:var(--shadow-btn)]">
                  <DotIcon name={pillar.iconName} size={24} className={pillar.iconColor} />
                </div>
                <PixelBadge variant={pillar.badgeVariant}>{pillar.tag}</PixelBadge>
              </div>

              <h3
                className="text-xl sm:text-2xl font-bold text-[var(--color-text-main)] mb-3 tracking-wide"
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

        {/* Tactical Callout Box */}
        <div className="mt-12 p-6 bg-[var(--color-elevated)] border-2 border-[var(--color-primary)]/50 pixel-box flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <DotIcon name="shield" size={24} className="text-[var(--color-accent)] shrink-0" />
            <div>
              <h4 className="text-[var(--color-text-main)] font-mono font-bold text-sm uppercase">
                Local Developer Preview Architecture
              </h4>
              <p className="text-xs sm:text-sm text-[var(--color-text-muted)] font-sans">
                Zero external cloud dependencies or telemetry tracking during local development. Run the full platform locally with modular sandbox adapters.
              </p>
            </div>
          </div>
          <PixelBadge variant="mint">DEV PREVIEW</PixelBadge>
        </div>
      </div>
    </section>
  );
}
