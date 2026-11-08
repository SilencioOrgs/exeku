"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useProfile } from "@/hooks/use-profile";
import { PixelCard } from "@/components/retro/pixel-card";
import { PixelBadge } from "@/components/retro/pixel-badge";
import { Code2, FileCode2, type LucideIcon } from "lucide-react";
import { draftRepository } from "@/lib/storage/draft-repository";
import {
  ALL_SUPPORTED_LANGUAGES,
  LANGUAGE_DISPLAY_NAMES,
  getFilenameForLanguage,
} from "@/lib/workspace-defaults";
import type { WorkspaceDraft } from "@/types/draft";
import type { PreferredLanguage } from "@/types/profile";

const LANGUAGE_ICONS: Record<PreferredLanguage, LucideIcon> = {
  python: Code2,
  java: Code2,
  cpp: Code2,
  c: FileCode2,
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
        <span className="text-xs text-[var(--color-accent)] animate-pulse">
          Reading local analytics...
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--color-border)] pb-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Progress
          </h1>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            Real activity from this device only.
          </p>
        </div>
      </div>

      {/* Real Local Analytics Matrix */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Profile Initialization */}
        <PixelCard variant="default" className="p-4 border border-[var(--color-border)] space-y-1.5">
          <span className="text-xs text-[var(--color-text-dim)] block">
            Profile initialized
          </span>
          <div className="font-semibold text-xl text-[var(--color-text-main)]">
            {createdDate}
          </div>
          <p className="text-xs text-[var(--color-text-muted)]">
            Updated: {updatedDate}
          </p>
        </PixelCard>

        {/* Metric 2: Local Buffers */}
        <PixelCard variant="default" className="p-4 border border-[var(--color-border)] space-y-1.5">
          <span className="text-xs text-[var(--color-text-dim)] block">
            Saved draft buffers
          </span>
          <div className="font-semibold text-xl text-[var(--color-accent)]">
            {isLoadingDrafts ? "..." : `${drafts.length} of 4 saved`}
          </div>
          <p className="text-xs text-[var(--color-text-muted)]">
            On this device
          </p>
        </PixelCard>

        {/* Metric 3: Curriculum Solved */}
        <PixelCard variant="default" className="p-4 border border-[var(--color-border)] space-y-1.5">
          <span className="text-xs text-[var(--color-text-dim)] block">
            Challenges solved
          </span>
          <div className="font-semibold text-xl text-[var(--color-primary-text)]">
            Not tracked yet
          </div>
          <p className="text-xs text-[var(--color-text-muted)]">
            Solved problems are not recorded yet
          </p>
        </PixelCard>

        {/* Metric 4: Code Executions */}
        <PixelCard variant="default" className="p-4 border border-[var(--color-border)] space-y-1.5">
          <span className="text-xs text-[var(--color-text-dim)] block">
            Code runs
          </span>
          <div className="font-semibold text-xl text-[var(--color-primary-text)]">
            Not tracked yet
          </div>
          <p className="text-xs text-[var(--color-text-muted)]">
            Runs are not recorded yet
          </p>
        </PixelCard>
      </div>


      {/* Saved Drafts Inventory */}
      <PixelCard variant="default" className="p-5 border border-[var(--color-border)] space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
          <div>
            <h2 className="font-semibold">
              Saved drafts
            </h2>
            <p className="text-xs text-[var(--color-text-dim)]">
              One scratchpad per language, saved on this device.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ALL_SUPPORTED_LANGUAGES.map((lang) => {
            const draft = drafts.find((d) => d.language === lang);
            const filename = getFilenameForLanguage(lang);
            const isPreferred = profile.preferredLanguage === lang;

            return (
              <div
                key={lang}
                className="flex flex-col justify-between space-y-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-canvas)] p-3.5"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    {React.createElement(LANGUAGE_ICONS[lang], { size: 18, color: "var(--color-accent)" })}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">
                          {LANGUAGE_DISPLAY_NAMES[lang]}
                        </span>
                        {isPreferred && (
                          <PixelBadge>Primary</PixelBadge>
                        )}
                      </div>
                      <span className="font-code text-xs text-[var(--color-text-dim)]">
                        {filename}
                      </span>
                    </div>
                  </div>

                  <PixelBadge>{draft ? "Edited draft" : "Starter code"}</PixelBadge>
                </div>

                <div className="pt-2 border-t border-[var(--color-border)]/40 flex items-center justify-between text-xs font-code">
                  <span className="text-[var(--color-text-dim)]">
                    {draft
                      ? `${draft.code.length} bytes \u2022 ${new Date(
                          draft.updatedAt
                        ).toLocaleTimeString()}`
                      : "Template staged"}
                  </span>
                  <Link href="/app/workspace" className={buttonVariants({ variant: "outline", size: "xs" })}>Open</Link>
                </div>
              </div>
            );
          })}
        </div>
      </PixelCard>

      {/* Curriculum Mastery Roadmap */}
      <PixelCard variant="elevated" className="p-5 border border-[var(--color-border)] space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
          <div>
            <h2 className="font-semibold">
              Curriculum mastery roadmap
            </h2>
            <p className="text-xs text-[var(--color-text-dim)]">
              Track structure for {LANGUAGE_DISPLAY_NAMES[profile.preferredLanguage]}.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {MASTERY_NODES.map((node) => (
            <div
              key={node.step}
              className="space-y-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-canvas)] p-3.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-code text-xs text-[var(--color-text-muted)]">
                  Stage {node.step}
                </span>
              </div>
              <h3 className="text-sm font-semibold">
                {node.title}
              </h3>
              <ul className="space-y-1 text-xs text-[var(--color-text-muted)]">
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
      <PixelCard variant="default" className="p-4 sm:p-5 border border-[var(--color-border)] space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-xs text-[var(--color-primary-text)]">
            Offline academic verification &amp; export
          </span>
        </div>
        <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
          Exeku will support exporting offline cryptographic progress certificates (<code>.json</code> bundle)
          verifiable by school teachers and lab instructors without requiring an internet connection.
        </p>
        <div className="pt-2">
          <Button type="button" variant="outline" disabled>
            <FileCode2 size={15} aria-hidden="true" />Export progress report (.json), coming soon
          </Button>
        </div>
      </PixelCard>
    </div>
  );
}
