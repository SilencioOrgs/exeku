"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useProfile } from "@/hooks/use-profile";
import { PixelCard } from "@/components/retro/pixel-card";
import { PixelBadge } from "@/components/retro/pixel-badge";
import { DotIcon, type DotIconName } from "@/components/retro/dot-icon";
import { draftRepository } from "@/lib/storage/draft-repository";
import {
  ALL_SUPPORTED_LANGUAGES,
  LANGUAGE_DISPLAY_NAMES,
  getFilenameForLanguage,
} from "@/lib/workspace-defaults";
import type { WorkspaceDraft } from "@/types/draft";
import type { PreferredLanguage } from "@/types/profile";

const LANGUAGE_ICONS: Record<PreferredLanguage, DotIconName> = {
  python: "python",
  java: "java",
  cpp: "cplusplus",
  c: "file",
};

const MASTERY_NODES = [
  {
    step: "01",
    title: "Syntax Foundations & Types",
    skills: ["Lexical structure", "Primitive types", "Variable binding", "Basic standard I/O"],
  },
  {
    step: "02",
    title: "Control Flow & State Accumulation",
    skills: ["Boolean algebra", "Branching logic", "Loop invariants", "Recursion basics"],
  },
  {
    step: "03",
    title: "Memory Semantics & Data Structures",
    skills: ["Stack vs heap allocation", "Arrays & buffers", "Linked references", "Hash maps"],
  },
  {
    step: "04",
    title: "Algorithms & Systems Architecture",
    skills: ["Time & space complexity", "Sorting benchmarks", "File I/O streams", "System calls"],
  },
];

export function ProgressView() {
  const { profile } = useProfile();
  const [drafts, setDrafts] = useState<WorkspaceDraft[]>([]);
  const [isLoadingDrafts, setIsLoadingDrafts] = useState(true);

  useEffect(() => {
    if (!profile) return;
    let isMounted = true;

    async function fetchDrafts() {
      try {
        if (!profile) return;
        const allDrafts = await draftRepository.getAllDraftsForProfile(profile.id);
        if (isMounted) {
          setDrafts(allDrafts);
          setIsLoadingDrafts(false);
        }
      } catch {
        if (isMounted) {
          setIsLoadingDrafts(false);
        }
      }
    }

    fetchDrafts();
    return () => {
      isMounted = false;
    };
  }, [profile]);

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <div className="w-10 h-10 border-4 border-[var(--color-accent)] border-t-transparent animate-spin mb-4" />
        <span className="font-mono text-xs text-[var(--color-accent)] uppercase tracking-widest animate-pulse">
          READING LOCAL ANALYTICS...
        </span>
      </div>
    );
  }

  const createdDate = new Date(profile.createdAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const updatedDate = new Date(profile.updatedAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="progress-view appearance-stack space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-[var(--color-border)] pb-4">
        <div>
          <h1 className="font-heading text-2xl text-[var(--color-text-main)] tracking-wide">
            SKILL BLUEPRINT &amp; LOCAL ANALYTICS_
          </h1>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            Transparent telemetry derived solely from real on-device records.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PixelBadge variant="mint" bracketed>
            ZERO FABRICATED METRICS
          </PixelBadge>
        </div>
      </div>

      {/* Real Local Analytics Matrix */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Profile Initialization */}
        <PixelCard variant="default" className="p-4 border-2 border-[var(--color-border)] space-y-1.5">
          <span className="font-mono text-[0.625rem] text-[var(--color-text-dim)] uppercase tracking-wider block">
            PROFILE INITIALIZED
          </span>
          <div className="font-heading text-xl text-[var(--color-text-main)]">
            {createdDate}
          </div>
          <p className="font-mono text-[0.6875rem] text-[var(--color-text-muted)]">
            Updated: {updatedDate}
          </p>
        </PixelCard>

        {/* Metric 2: Local Buffers */}
        <PixelCard variant="default" className="p-4 border-2 border-[var(--color-border)] space-y-1.5">
          <span className="font-mono text-[0.625rem] text-[var(--color-text-dim)] uppercase tracking-wider block">
            SAVED DRAFT BUFFERS
          </span>
          <div className="font-heading text-xl text-[var(--color-accent)]">
            {isLoadingDrafts ? "..." : `${drafts.length} / 4 SAVED`}
          </div>
          <p className="font-mono text-[0.6875rem] text-[var(--color-text-muted)]">
            IndexedDB v2 partition
          </p>
        </PixelCard>

        {/* Metric 3: Curriculum Solved */}
        <PixelCard variant="default" className="p-4 border-2 border-[var(--color-border)] space-y-1.5">
          <span className="font-mono text-[0.625rem] text-[var(--color-text-dim)] uppercase tracking-wider block">
            CHALLENGES SOLVED
          </span>
          <div className="font-heading text-xl text-[var(--color-mint)]">
            0 / 0 LOADED
          </div>
          <p className="font-mono text-[0.6875rem] text-[var(--color-text-muted)]">
            Packs pending Phase 2C
          </p>
        </PixelCard>

        {/* Metric 4: Code Executions */}
        <PixelCard variant="default" className="p-4 border-2 border-[var(--color-border)] space-y-1.5">
          <span className="font-mono text-[0.625rem] text-[var(--color-text-dim)] uppercase tracking-wider block">
            MACHINE EXECUTIONS
          </span>
          <div className="font-heading text-xl text-[var(--color-pink)]">
            0 LOCAL RUNS
          </div>
          <p className="font-mono text-[0.6875rem] text-[var(--color-text-muted)]">
            Runner standby (Phase 2B)
          </p>
        </PixelCard>
      </div>

      {/* Philosophy Callout: Zero Fabricated Streaks */}
      <PixelCard
        variant="elevated"
        className="p-4 sm:p-5 border-2 border-[var(--color-border)] bg-[var(--color-surface)] space-y-2"
      >
        <div className="flex items-center gap-2">
          <span className="font-heading text-sm text-[var(--color-accent)]">
            [DATA TRUTH GUARANTEE]
          </span>
          <PixelBadge variant="purple" bracketed>
            NO GAMIFICATION
          </PixelBadge>
        </div>
        <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
          Exeku does not fabricate artificial daily streaks, fake XP levels, or manipulative retention
          counters. Your programming journey takes place on your machine, at your pace, and solely
          reflects real code written and verified on-device.
        </p>
      </PixelCard>

      {/* Saved Drafts Inventory */}
      <PixelCard variant="default" className="p-5 border-2 border-[var(--color-border)] space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
          <div>
            <h2 className="font-heading text-base text-[var(--color-text-main)]">
              SAVED DRAFT INVENTORY (INDEXEDDB)_
            </h2>
            <p className="text-xs text-[var(--color-text-dim)]">
              Real state of your offline language scratchpads on this machine.
            </p>
          </div>
          <PixelBadge variant="cyan" bracketed>
            4 LANGUAGES
          </PixelBadge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ALL_SUPPORTED_LANGUAGES.map((lang) => {
            const draft = drafts.find((d) => d.language === lang);
            const filename = getFilenameForLanguage(lang);
            const isPreferred = profile.preferredLanguage === lang;

            return (
              <div
                key={lang}
                className="p-3.5 bg-[var(--color-canvas)] border border-[var(--color-border)] flex flex-col justify-between space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <DotIcon name={LANGUAGE_ICONS[lang]} size={18} color="var(--color-accent)" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-heading text-sm text-[var(--color-text-main)]">
                          {LANGUAGE_DISPLAY_NAMES[lang]}
                        </span>
                        {isPreferred && (
                          <span className="text-[0.625rem] font-mono px-1 bg-[var(--color-elevated)] border border-[var(--color-accent)] text-[var(--color-accent)]">
                            PRIMARY
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-xs text-[var(--color-text-dim)]">
                        {filename}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`font-mono text-[0.625rem] px-1.5 py-0.5 border ${
                      draft
                        ? "border-[var(--color-mint)]/40 text-[var(--color-mint)] bg-[var(--color-mint)]/10"
                        : "border-[var(--color-text-dim)]/40 text-[var(--color-text-dim)] bg-[var(--color-text-dim)]/10"
                    }`}
                  >
                    {draft ? "MODIFIED DRAFT" : "DEFAULT STARTER"}
                  </span>
                </div>

                <div className="pt-2 border-t border-[var(--color-border)]/40 flex items-center justify-between text-xs font-mono">
                  <span className="text-[var(--color-text-dim)]">
                    {draft
                      ? `${draft.code.length} bytes \u2022 ${new Date(
                          draft.updatedAt
                        ).toLocaleTimeString()}`
                      : "Template staged"}
                  </span>
                  <Link
                    href="/app/workspace"
                    className="text-[var(--color-accent)] hover:underline flex items-center gap-1 group"
                  >
                    <span>OPEN</span>
                    <span className="group-hover:translate-x-0.5 transition-transform">&rarr;</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </PixelCard>

      {/* Curriculum Mastery Roadmap */}
      <PixelCard variant="elevated" className="p-5 border-2 border-[var(--color-border)] space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
          <div>
            <h2 className="font-heading text-base text-[var(--color-text-main)]">
              CURRICULUM MASTERY ROADMAP_
            </h2>
            <p className="text-xs text-[var(--color-text-dim)]">
              Track structure for {LANGUAGE_DISPLAY_NAMES[profile.preferredLanguage]}.
            </p>
          </div>
          <PixelBadge variant="purple" bracketed>
            PHASE 2C BLUEPRINT
          </PixelBadge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {MASTERY_NODES.map((node) => (
            <div
              key={node.step}
              className="p-3.5 bg-[var(--color-canvas)] border border-[var(--color-border)] space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-heading text-xs text-[var(--color-accent)]">
                  STAGE {node.step}
                </span>
                <span className="font-mono text-[0.625rem] text-[var(--color-text-dim)]">
                  [STANDBY]
                </span>
              </div>
              <h3 className="font-heading text-sm text-[var(--color-text-main)]">
                {node.title}
              </h3>
              <ul className="space-y-1 text-[0.6875rem] font-mono text-[var(--color-text-muted)]">
                {node.skills.map((skill, idx) => (
                  <li key={idx} className="flex items-center gap-1.5">
                    <span className="text-[var(--color-border)]">&bull;</span>
                    <span>{skill}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </PixelCard>

      {/* Offline Student Report Placeholder */}
      <PixelCard variant="default" className="p-4 sm:p-5 border-2 border-[var(--color-border)] space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-heading text-xs text-[var(--color-mint)] tracking-wider">
            [OFFLINE ACADEMIC VERIFICATION &amp; EXPORT]
          </span>
          <PixelBadge variant="mint" bracketed>
            CLASSROOM READY
          </PixelBadge>
        </div>
        <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
          Exeku will support exporting offline cryptographic progress certificates (<code>.json</code> bundle)
          verifiable by school teachers and lab instructors without requiring an internet connection.
        </p>
        <div className="pt-2">
          <button
            type="button"
            disabled
            className="px-4 py-2 border border-[var(--color-border)] bg-[var(--color-canvas)]/60 text-[var(--color-text-dim)] font-mono text-xs cursor-not-allowed opacity-60 flex items-center gap-2"
          >
            <DotIcon name="file" size={14} color="var(--color-text-dim)" />
            <span>EXPORT PROGRESS REPORT (.json) [PHASE 2C]</span>
          </button>
        </div>
      </PixelCard>
    </div>
  );
}
