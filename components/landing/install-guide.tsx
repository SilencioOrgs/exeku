"use client";

import React, { useState } from "react";
import { PixelBadge } from "@/components/retro/pixel-badge";
import { PixelCard } from "@/components/retro/pixel-card";
import { DotIcon, type DotIconName } from "@/components/retro/dot-icon";
import { Copy, Check } from "lucide-react";

export function InstallGuide() {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const steps: {
    step: string;
    title: string;
    command: string;
    notes: string;
    icon: DotIconName;
  }[] = [
    {
      step: "01",
      title: "Clone From Private Repository",
      command: "git clone https://github.com/SilencioOrgs/exeku.git\ncd exeku",
      notes: "Requires authorized collaborator access to the SilencioOrgs/exeku private GitHub repository.",
      icon: "github",
    },
    {
      step: "02",
      title: "Install Dependencies",
      command: "npm install",
      notes: "Installs Next.js 16, React 19, Tailwind CSS v4, and Monaco Editor packages locally.",
      icon: "npm",
    },
    {
      step: "03",
      title: "Launch Local Server",
      command: "npm run dev",
      notes: "Starts the local developer server. Open http://localhost:3000 in your browser.",
      icon: "powershell",
    },
  ];

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => {
      setCopiedIndex(null);
    }, 2000);
  };

  return (
    <section id="install" className="py-20 md:py-28 bg-[var(--color-canvas)] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mb-14">
          <div className="mb-3">
            <PixelBadge variant="cyan">DEVELOPER SETUP</PixelBadge>
          </div>
          <h2
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-[var(--color-text-main)] mb-6 uppercase tracking-tight"
            style={{ fontFamily: "var(--font-heading-active)" }}
          >
            Run The Developer Preview.
          </h2>
          <p className="text-base sm:text-lg text-[var(--color-text-muted)] font-sans leading-relaxed">
            Exeku is currently in local developer preview. Clone and launch the Next.js platform locally,
            or optionally run the Piston sandbox runner for live containerized execution.
          </p>
        </div>

        {/* Repository Access Notice */}
        <div className="mb-10 p-5 bg-[var(--color-elevated)] border-2 border-[var(--color-primary)]/50 pixel-box flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <DotIcon name="lock-close" size={20} className="text-[var(--color-accent)] mt-0.5 shrink-0" />
            <div>
              <h3 className="text-[var(--color-text-main)] font-mono font-bold text-sm uppercase">
                Private Repository Access Required
              </h3>
              <p className="text-xs sm:text-sm text-[var(--color-text-muted)] font-sans">
                Source code is hosted privately at{" "}
                <code className="text-[var(--color-accent)] bg-[var(--color-canvas)] px-1.5 py-0.5 font-mono">
                  github.com/SilencioOrgs/exeku
                </code>
                . Ensure your GitHub account has been granted collaborator access before cloning.
              </p>
            </div>
          </div>
          <PixelBadge variant="pink">PRIVATE REPO</PixelBadge>
        </div>

        {/* 3 Step Pipeline */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((s, idx) => (
            <PixelCard
              key={s.step}
              variant="default"
              className="bg-[var(--color-surface)] border-2 border-[var(--color-border)] flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span
                    className="text-3xl font-bold text-[var(--color-accent)]"
                    style={{ fontFamily: "var(--font-heading-active)" }}
                  >
                    STEP {s.step}
                  </span>
                  <DotIcon name={s.icon} size={18} className="text-[var(--color-text-muted)]" />
                </div>

                <h4 className="text-lg font-bold text-[var(--color-text-main)] font-mono mb-2">
                  {s.title}
                </h4>

                <p className="text-xs text-[var(--color-text-muted)] mb-4 min-h-[36px]">
                  {s.notes}
                </p>
              </div>

              {/* Command Box with Copy Button */}
              <div className="mt-2 bg-[var(--color-canvas)] border border-[var(--color-border)] p-3 flex flex-col justify-between gap-2">
                <code className="text-xs font-mono text-[var(--color-mint)] whitespace-pre break-all">
                  {s.command}
                </code>

                <button
                  type="button"
                  onClick={() => handleCopy(s.command, idx)}
                  className="self-end mt-1 px-2.5 py-1 text-xs font-mono bg-[var(--color-elevated)] hover:bg-[var(--color-border)] text-[var(--color-accent)] border border-[var(--color-accent)]/30 flex items-center gap-1.5 transition-colors cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-accent)]"
                >
                  {copiedIndex === idx ? (
                    <>
                      <Check className="w-3 h-3 text-[var(--color-mint)]" />
                      <span className="text-[var(--color-mint)]">COPIED!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>COPY</span>
                    </>
                  )}
                </button>
              </div>
            </PixelCard>
          ))}
        </div>

        {/* PowerShell Troubleshooting Tip */}
        <div className="mt-8 p-4 bg-[var(--color-surface)] border border-[var(--color-border)] flex items-start gap-3 text-xs font-mono text-[var(--color-text-muted)]">
          <DotIcon name="powershell" size={16} className="text-[var(--color-pink)] shrink-0 mt-0.5" />
          <div>
            <strong className="text-[var(--color-text-main)]">Windows PowerShell Execution Policy Note:</strong> If you receive a script execution policy restriction error when running npm commands, invoke PowerShell as Administrator or run:{" "}
            <code className="text-[var(--color-accent)] bg-[var(--color-canvas)] px-1 py-0.5">
              Set-ExecutionPolicy -Scope Process RemoteSigned
            </code>
          </div>
        </div>
      </div>
    </section>
  );
}
