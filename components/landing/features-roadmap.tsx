import React from "react";
import { PixelBadge } from "@/components/retro/pixel-badge";
import { PixelCard } from "@/components/retro/pixel-card";
import { DotIcon, type DotIconName } from "@/components/retro/dot-icon";
import { Clock } from "lucide-react";

export function FeaturesRoadmap() {
  const currentFoundation: Array<{
    title: string;
    status: string;
    statusVariant: "mint";
    iconName: DotIconName;
    description: string;
  }> = [
    {
      title: "Next.js 16 Offline Web Shell",
      status: "CURRENT FOUNDATION",
      statusVariant: "mint",
      iconName: "next",
      description:
        "High-performance local web application built on Next.js 16 App Router and React 19. Designed to run locally on Windows machines with zero network roundtrips.",
    },
    {
      title: "Monaco Editor Integration",
      status: "CURRENT FOUNDATION",
      statusVariant: "mint",
      iconName: "vscode",
      description:
        "Professional desktop-grade code editor with syntax highlighting, indentation guides, and keyboard navigation packaged completely inside local bundles.",
    },
    {
      title: "Retro Pixel UI System",
      status: "CURRENT FOUNDATION",
      statusVariant: "mint",
      iconName: "stars",
      description:
        "Custom 8-bit/16-bit developer aesthetic built with Tailwind CSS v4 and Base UI primitives. High-contrast, keyboard-accessible, and dark violet by default.",
    },
    {
      title: "Zero Runtime CDN Dependencies",
      status: "CURRENT FOUNDATION",
      statusVariant: "mint",
      iconName: "shield",
      description:
        "All stylesheets, icons, and interface assets are bundled locally. No telemetry scripts, external trackers, or remote fonts loaded at runtime.",
    },
  ];

  const plannedRoadmap: Array<{
    title: string;
    status: string;
    statusVariant: "pink";
    iconName: DotIconName;
    description: string;
  }> = [
    {
      title: "Local Execution Engine",
      status: "PLANNED ROADMAP",
      statusVariant: "pink",
      iconName: "cog",
      description:
        "On-device process supervisor to compile and run student code using local Python 3, OpenJDK, GCC, and Clang installations without external servers.",
    },
    {
      title: "Automated On-Device Grading",
      status: "PLANNED ROADMAP",
      statusVariant: "pink",
      iconName: "circleCheck",
      description:
        "Instant test-suite evaluation running directly on the student's hardware. Instant pass/fail feedback and test execution metrics with zero network latency.",
    },
    {
      title: "Offline AI Learning Assistant",
      status: "PLANNED ROADMAP",
      statusVariant: "pink",
      iconName: "ai",
      description:
        "Quantized local language model tailored for computer science pedagogy. Provides syntax guidance, debugging hints, and conceptual explanations entirely offline.",
    },
    {
      title: "Local Profiles & Progress Tracking",
      status: "PLANNED ROADMAP",
      statusVariant: "pink",
      iconName: "database",
      description:
        "File-backed local persistence for curriculum mastery, problem history, and streak metrics. Zero cloud accounts, passwords, or data leakage.",
    },
  ];

  return (
    <section id="features" className="py-20 md:py-28 bg-[#0B0617] border-t-2 border-b-2 border-[#2E1A57] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mb-14">
          <div className="mb-3">
            <PixelBadge variant="pink">ARCHITECTURE & ROADMAP</PixelBadge>
          </div>
          <h2
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6 uppercase tracking-tight"
            style={{ fontFamily: "var(--font-pixelify)" }}
          >
            Honest Architecture.
          </h2>
          <p className="text-base sm:text-lg text-[#A79EC4] font-sans leading-relaxed">
            We believe in complete architectural transparency. Below is a clear distinction
            between the active foundation currently established in our repository and the
            execution engines actively being developed on our roadmap.
          </p>
        </div>

        {/* Dual Grid Comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Column 1: Current Foundation */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 pb-3 border-b-2 border-[#00FF9D]/40">
              <span className="w-2.5 h-2.5 bg-[#00FF9D] inline-block" />
              <h3
                className="text-xl sm:text-2xl font-bold text-white tracking-wider"
                style={{ fontFamily: "var(--font-pixelify)" }}
              >
                Current Foundation
              </h3>
              <PixelBadge variant="mint" className="ml-auto">AVAILABLE NOW</PixelBadge>
            </div>

            <div className="space-y-4">
              {currentFoundation.map((item) => (
                <PixelCard
                  key={item.title}
                  variant="default"
                  cornerMarks={false}
                  className="p-5 bg-[#120A24] border-2 border-[#2E1A57] hover:border-[#00FF9D]/50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-[#1B0F36] border border-[#2E1A57] text-[#00FF9D] shrink-0 mt-0.5">
                      <DotIcon name={item.iconName} size={18} className="text-[#00FF9D]" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-white font-mono tracking-wide mb-1">
                        {item.title}
                      </h4>
                      <p className="text-xs sm:text-sm text-[#A79EC4] leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </PixelCard>
              ))}
            </div>
          </div>

          {/* Column 2: Development Roadmap */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 pb-3 border-b-2 border-[#FF007A]/40">
              <span className="w-2.5 h-2.5 bg-[#FF007A] inline-block" />
              <h3
                className="text-xl sm:text-2xl font-bold text-white tracking-wider"
                style={{ fontFamily: "var(--font-pixelify)" }}
              >
                Development Roadmap
              </h3>
              <PixelBadge variant="pink" className="ml-auto">IN DEVELOPMENT</PixelBadge>
            </div>

            <div className="space-y-4">
              {plannedRoadmap.map((item) => (
                <PixelCard
                  key={item.title}
                  variant="default"
                  cornerMarks={false}
                  className="p-5 bg-[#120A24] border-2 border-[#2E1A57] hover:border-[#FF007A]/50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-[#1B0F36] border border-[#2E1A57] text-[#FF007A] shrink-0 mt-0.5">
                      <DotIcon name={item.iconName} size={18} className="text-[#FF007A]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-base font-bold text-white font-mono tracking-wide">
                          {item.title}
                        </h4>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 bg-[#2E0B1A] text-[#FF007A] border border-[#FF007A]/40 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" /> Planned
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-[#A79EC4] leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </PixelCard>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
