"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useProfile } from "@/hooks/use-profile";
import { PixelBadge } from "@/components/retro/pixel-badge";
import { PixelButton } from "@/components/retro/pixel-button";
import { DotIcon } from "@/components/retro/dot-icon";
import { PixelTerminal } from "./pixel-terminal";
import { ArrowDown } from "lucide-react";

export function Hero() {
  const router = useRouter();
  const { profile } = useProfile();

  return (
    <section id="hero" className="relative pt-12 pb-20 md:pt-20 md:pb-28 overflow-hidden">
      {/* Ambient retro glow backgrounds */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-[#9E00FF]/15 blur-[120px] pointer-events-none rounded-full" />
      <div className="absolute top-1/3 left-1/4 w-[300px] h-[200px] bg-[#00F0FF]/10 blur-[100px] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto mb-12 sm:mb-16">
          {/* Section Kicker */}
          <div className="mb-6 flex flex-wrap items-center justify-center gap-2">
            <PixelBadge variant="pink">LOCAL DEVELOPER PREVIEW</PixelBadge>
            <PixelBadge variant="cyan">ONLINE JUDGE ARCHITECTURE</PixelBadge>
          </div>

          {/* Headline */}
          <h1
            className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-white mb-6 uppercase leading-[1.1]"
            style={{ fontFamily: "var(--font-pixelify)" }}
          >
            YOUR CODE. <br className="hidden sm:inline" />
            <span className="text-[#00F0FF]">
              YOUR MACHINE.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl text-[#A79EC4] max-w-2xl font-sans leading-relaxed mb-8">
            An online programming practice, assessment, and competition platform inspired by CodeChum.
            Solve challenges, run code in isolated sandboxes, and receive instant judging verdicts across Python 3, Java, C++, and C.
          </p>

          {/* Call to action buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <PixelButton
              variant="cyan"
              size="lg"
              onClick={() => router.push(profile ? "/app" : "/setup")}
              className="w-full sm:w-auto"
            >
              <DotIcon name="windows" size={16} className="text-[#090514]" />{" "}
              {profile ? "Launch Workspace ▶" : "Get Started (Setup Profile) ▶"}
            </PixelButton>

            <PixelButton
              variant="secondary"
              size="lg"
              href="#about"
              className="w-full sm:w-auto"
            >
              About Exeku <ArrowDown className="w-4 h-4 text-[#00F0FF]" />
            </PixelButton>
          </div>

          {/* Core Trust Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-8 mt-10 pt-8 border-t border-[#2E1A57]/60 w-full max-w-2xl font-mono text-xs text-[#A79EC4]">
            <div className="flex items-center justify-center gap-2">
              <DotIcon name="shield" size={16} className="text-[#00FF9D]" />
              <span>Container Sandboxing</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <DotIcon name="cog" size={16} className="text-[#00F0FF]" />
              <span>Automatic Judging</span>
            </div>
            <div className="col-span-2 sm:col-span-1 flex items-center justify-center gap-2">
              <DotIcon name="powershell" size={16} className="text-[#FF007A]" />
              <span>4 Core Languages</span>
            </div>
          </div>
        </div>

        {/* Centerpiece Pixel Terminal */}
        <div className="max-w-5xl mx-auto">
          <div className="mb-2 flex items-center justify-between text-xs font-mono text-[#A79EC4] px-1">
            <span>[CENTERPIECE: INTERACTIVE PREVIEW]</span>
            <span className="text-[#00F0FF]">LOCAL_CONSOLE</span>
          </div>
          <PixelTerminal />
        </div>
      </div>
    </section>
  );
}
