import React from "react";
import { PixelBadge } from "@/components/retro/pixel-badge";
import { PixelCard } from "@/components/retro/pixel-card";
import { ServerOff, School, Cpu, Sparkles } from "lucide-react";

export function About() {
  const pillars = [
    {
      icon: ServerOff,
      title: "Zero Cloud Lock-In",
      tag: "TOTAL AUTONOMY",
      badgeVariant: "pink" as const,
      description:
        "Modern coding tools often demand continuous high-speed internet, remote virtual machines, and cloud accounts. Exeku breaks this dependency: your editor, curriculum, and records stay entirely on your local drive with zero remote telemetry.",
    },
    {
      icon: School,
      title: "Built for Lab Realities",
      tag: "CLASSROOM RESILIENT",
      badgeVariant: "cyan" as const,
      description:
        "Educational computer labs frequently face restrictive school firewalls, erratic Wi-Fi, or strict air-gapped policies. Exeku runs reliably on local Windows workstations without requiring external proxy bypasses or cloud authorization.",
    },
    {
      icon: Cpu,
      title: "Bare-Metal Intimacy",
      tag: "REAL COMPUTING",
      badgeVariant: "mint" as const,
      description:
        "Instead of abstracting execution into remote serverless black boxes, Exeku is designed around the reality of your local machine. Students learn how native compilers, operating systems, and memory actually function.",
    },
  ];

  return (
    <section id="about" className="py-20 md:py-28 bg-[#0B0617] border-t-2 border-b-2 border-[#2E1A57] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mb-14">
          <div className="mb-3">
            <PixelBadge variant="purple">ABOUT EXEKU</PixelBadge>
          </div>
          <h2
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6 uppercase tracking-tight"
            style={{ fontFamily: "var(--font-pixelify)" }}
          >
            The Machine Is The Lab.
          </h2>
          <p className="text-base sm:text-lg text-[#A79EC4] font-sans leading-relaxed">
            Exeku is an offline-first programming education platform designed to make
            computer science education resilient, accessible, and distraction-free. By
            anchoring the learning process to the student&apos;s own machine, we eliminate the
            fragility of cloud IDEs.
          </p>
        </div>

        {/* 3 Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {pillars.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <PixelCard
                key={pillar.title}
                variant="default"
                className="bg-[#120A24] hover:border-[#9E00FF] transition-all group"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="w-12 h-12 bg-[#1B0F36] border-2 border-[#2E1A57] group-hover:border-[#00F0FF] flex items-center justify-center transition-colors shadow-[2px_2px_0px_#000000]">
                    <Icon className="w-6 h-6 text-[#00F0FF]" />
                  </div>
                  <PixelBadge variant={pillar.badgeVariant}>{pillar.tag}</PixelBadge>
                </div>

                <h3
                  className="text-xl sm:text-2xl font-bold text-white mb-3 tracking-wide"
                  style={{ fontFamily: "var(--font-pixelify)" }}
                >
                  {pillar.title}
                </h3>

                <p className="text-sm sm:text-base text-[#A79EC4] leading-relaxed">
                  {pillar.description}
                </p>
              </PixelCard>
            );
          })}
        </div>

        {/* Tactical Callout Box */}
        <div className="mt-12 p-6 bg-[#160B2E] border-2 border-[#9E00FF]/50 pixel-box flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-[#00F0FF] shrink-0" />
            <div>
              <h4 className="text-white font-mono font-bold text-sm uppercase">
                Privacy By Architecture, Not Policy
              </h4>
              <p className="text-xs sm:text-sm text-[#A79EC4] font-sans">
                No telemetry servers. No cookies. No third-party trackers. Your learning activity stays on your Windows machine.
              </p>
            </div>
          </div>
          <PixelBadge variant="mint">100% PRIVATE</PixelBadge>
        </div>
      </div>
    </section>
  );
}
