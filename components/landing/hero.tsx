"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useProfile } from "@/hooks/use-profile";
import { PixelBadge } from "@/components/retro/pixel-badge";
import { PixelButton } from "@/components/retro/pixel-button";
import { DotIcon } from "@/components/retro/dot-icon";
import { PixelTerminal } from "./pixel-terminal";

import { StyleText } from "@/components/appearance/style-text";

export function Hero() {
  const router = useRouter();
  const { profile } = useProfile();

  return (
    <section id="hero" className="relative pt-12 pb-20 md:pt-20 md:pb-28 overflow-hidden">
      {/* Ambient retro glow backgrounds */}
      <div className="arcade-decoration absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-[var(--color-primary)]/15 blur-[120px] pointer-events-none rounded-full" />
      <div className="arcade-decoration absolute top-1/3 left-1/4 w-[300px] h-[200px] bg-[var(--color-accent)]/10 blur-[100px] pointer-events-none rounded-full" />

      <div className="landing-hero-layout max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="landing-hero-copy flex flex-col items-center text-center max-w-4xl mx-auto mb-12 sm:mb-16">
          {/* Developer-preview status, not a fake metric */}
          <div className="mb-6 flex flex-wrap items-center justify-center gap-2">
            <PixelBadge variant="muted">Developer preview</PixelBadge>
          </div>

          {/* Headline */}
          <h1
            className="text-4xl sm:text-6xl md:text-7xl font-semibold tracking-tight text-[var(--color-text-main)] mb-6 leading-[1.1]"
            style={{ fontFamily: "var(--font-heading-active)" }}
          >
            <StyleText arcade="YOUR CODE." clarity="Your code." /> <br className="hidden sm:inline" />
            <span className="text-[var(--color-accent)]">
              <StyleText arcade="YOUR MACHINE." clarity="Your machine." />
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl text-[var(--color-text-muted)] max-w-2xl font-sans leading-relaxed mb-8">
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
              <DotIcon name="windows" size={16} className="text-[var(--color-accent-foreground)]" />{" "}
              {profile ? "Launch Workspace" : "Get Started (Setup Profile)"}
            </PixelButton>

            <PixelButton
              variant="secondary"
              size="lg"
              href="#about"
              className="w-full sm:w-auto"
            >
              About Exeku <DotIcon name="arrowDown" className="w-4 h-4 text-[var(--color-accent)]" />
            </PixelButton>
          </div>

          {/* Core Trust Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-8 mt-10 pt-8 border-t border-[var(--color-border)]/60 w-full max-w-2xl font-mono text-xs text-[var(--color-text-muted)]">
            <div className="flex items-center justify-center gap-2">
              <DotIcon name="shield" size={16} className="text-[var(--color-mint)]" />
              <span>Container Sandboxing</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <DotIcon name="cog" size={16} className="text-[var(--color-accent)]" />
              <span>Automatic Judging</span>
            </div>
            <div className="col-span-2 sm:col-span-1 flex items-center justify-center gap-2">
              <DotIcon name="powershell" size={16} className="text-[var(--color-pink)]" />
              <span>4 Core Languages</span>
            </div>
          </div>
        </div>

        {/* Centerpiece Pixel Terminal */}
        <div className="landing-hero-demo max-w-5xl mx-auto">

          <PixelTerminal />
        </div>
      </div>
    </section>
  );
}
