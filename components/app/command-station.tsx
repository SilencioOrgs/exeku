"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useProfile } from "@/hooks/use-profile";
import { PixelAvatar } from "@/components/retro/pixel-avatar";
import { PixelCard } from "@/components/retro/pixel-card";
import { PixelButton } from "@/components/retro/pixel-button";
import { PixelBadge } from "@/components/retro/pixel-badge";
import { DotIcon, type DotIconName } from "@/components/retro/dot-icon";
import { ProfileEditDialog } from "./profile-edit-dialog";
import { StyleText } from "@/components/appearance/style-text";
import { ArrowUpRight, Pencil, Terminal } from "lucide-react";
import { draftRepository } from "@/lib/storage/draft-repository";
import {
  getFilenameForLanguage,
  LANGUAGE_DISPLAY_NAMES,
} from "@/lib/workspace-defaults";
import type { WorkspaceDraft } from "@/types/draft";
import type { PreferredLanguage } from "@/types/profile";

interface LanguageMeta {
  label: string;
  icon: DotIconName;
  compiler: string;
  accent: string;
}

const LANGUAGE_META: Record<PreferredLanguage, LanguageMeta> = {
  python: {
    label: "Python 3",
    icon: "python",
    compiler: "CPython 3.12+ (local runtime)",
    accent: "var(--color-accent)",
  },
  java: {
    label: "Java",
    icon: "java",
    compiler: "OpenJDK 21+ (local runtime)",
    accent: "var(--color-pink)",
  },
  cpp: {
    label: "C++",
    icon: "cplusplus",
    compiler: "MSVC / GCC (local runtime)",
    accent: "var(--color-primary-text)",
  },
  c: {
    label: "C",
    icon: "file",
    compiler: "MSVC / Clang (local runtime)",
    accent: "var(--color-mint)",
  },
};

const TRACK_MODULES = [
  {
    code: "01",
    title: "Syntax & Standard I/O",
    desc: "Lexical tokens, typed primitives, expressions, and stream input/output.",
    topics: "4 problem sets",
  },
  {
    code: "02",
    title: "Control Flow & Branching",
    desc: "Conditional branching, loop invariants, state accumulation, and jumps.",
    topics: "6 problem sets",
  },
  {
    code: "03",
    title: "Memory & Data Structures",
    desc: "Stack vs heap semantics, pointers/references, lists, and hash lookup.",
    topics: "8 problem sets",
  },
  {
    code: "04",
    title: "Algorithms & Systems",
    desc: "Sorting complexity, recursion trees, file descriptors, and systems design.",
    topics: "10 problem sets",
  },
];

export function CommandStation() {
  const { profile, updateProfile } = useProfile();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [activeDraft, setActiveDraft] = useState<WorkspaceDraft | null>(null);
  const [totalDrafts, setTotalDrafts] = useState<number>(0);

  useEffect(() => {
    if (!profile) return;
    let isCancelled = false;

    async function loadDrafts() {
      try {
        if (!profile) return;
        const [current, all] = await Promise.all([
          draftRepository.getDraft(profile.id, profile.preferredLanguage),
          draftRepository.getAllDraftsForProfile(profile.id),
        ]);
        if (!isCancelled) {
          setActiveDraft(current);
          setTotalDrafts(all.length);
        }
      } catch {
        // Silently fall back to defaults
      }
    }

    loadDrafts();
    return () => {
      isCancelled = true;
    };
  }, [profile]);

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <div className="w-10 h-10 border-4 border-[var(--color-accent)] border-t-transparent animate-spin mb-4" />
        <span className="font-mono text-xs text-[var(--color-accent)] uppercase tracking-widest animate-pulse">
          READING LOCAL TELEMETRY...
        </span>
      </div>
    );
  }

  const langInfo = LANGUAGE_META[profile.preferredLanguage] ?? LANGUAGE_META.python;
  const filename = getFilenameForLanguage(profile.preferredLanguage);
  const memberSince = new Date(profile.createdAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const levelBadgeVariant =
    profile.experienceLevel === "beginner"
      ? "mint"
      : profile.experienceLevel === "intermediate"
      ? "cyan"
      : "pink";

  const levelNum =
    profile.experienceLevel === "beginner"
      ? "01"
      : profile.experienceLevel === "intermediate"
      ? "02"
      : "03";

  return (
    <div className="dashboard appearance-stack space-y-6">
      {/* Coder Spotlight Header */}
      <PixelCard
        variant="elevated"
        className="dashboard-profile p-5 sm:p-6 border-2 border-[var(--color-border)] bg-[var(--color-surface)] relative overflow-hidden"
      >
        <div
          className="arcade-decoration absolute -right-16 -top-16 w-64 h-64 rounded-full pointer-events-none opacity-20 blur-3xl"
          style={{ background: langInfo.accent }}
        />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start sm:items-center gap-4">
            <PixelAvatar
              avatarId={profile.avatarId}
              size={56}
              className="border-2 border-[var(--color-accent)] [box-shadow:var(--shadow-btn)] shrink-0"
            />
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="dashboard-heading font-heading text-xl sm:text-2xl text-[var(--color-text-main)] tracking-wide"><StyleText arcade={<>WELCOME, {profile.displayName.toUpperCase()}_</>} clarity={<>Welcome back, {profile.displayName}</>} command="Workspace overview" /></h1>
                <PixelBadge variant={levelBadgeVariant} bracketed>
                  LVL {levelNum}: {profile.experienceLevel.toUpperCase()}
                </PixelBadge>
              </div>
              {profile.bio ? (
                <p className="text-sm text-[var(--color-text-muted)] max-w-xl line-clamp-2">
                  &ldquo;{profile.bio}&rdquo;
                </p>
              ) : (
                <p className="text-xs text-[var(--color-text-dim)] font-mono">
                  No local bio set &bull; Local ID: {profile.id.slice(0, 8)} &bull; Member since {memberSince}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto">
            <Link href="/app/workspace" className="flex-1 md:flex-initial">
              <PixelButton variant="primary" size="md" className="w-full">
                Open workspace <span className="arcade-copy">▶</span><ArrowUpRight className="modern-icon" size={16} />
              </PixelButton>
            </Link>
            <PixelButton
              variant="secondary"
              size="md"
              onClick={() => setIsEditOpen(true)}
              className="whitespace-nowrap"
            >
              Edit profile <span className="arcade-copy">✎</span><Pencil className="modern-icon" size={15} />
            </PixelButton>
          </div>
        </div>
      </PixelCard>

      {/* Loadout Telemetry Matrix */}
      <div className="dashboard-summary grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Target Language */}
        <PixelCard variant="default" className="p-4 sm:p-5 border-2 border-[var(--color-border)] space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[0.625rem] text-[var(--color-text-muted)] uppercase tracking-wider">
              <StyleText arcade="[01 // TARGET LANGUAGE]" clarity="Preferred language" command="Language & runtime" />
            </span>
            <PixelBadge variant="purple" bracketed>
              PRIMARY
            </PixelBadge>
          </div>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 border border-[var(--color-border)] bg-[var(--color-canvas)] flex items-center justify-center shrink-0"
              style={{ borderColor: langInfo.accent }}
            >
              <DotIcon name={langInfo.icon} size={22} color={langInfo.accent} />
            </div>
            <div>
              <div className="font-heading text-lg text-[var(--color-text-main)]">
                {LANGUAGE_DISPLAY_NAMES[profile.preferredLanguage]}
              </div>
              <div className="font-mono text-[0.6875rem] text-[var(--color-text-dim)]">
                {langInfo.compiler}
              </div>
            </div>
          </div>
          <div className="pt-2 border-t border-[var(--color-border)]/60 flex items-center justify-between text-xs font-mono text-[var(--color-text-muted)]">
            <span>Level Track:</span>
            <span className="text-[var(--color-accent)] uppercase">{profile.experienceLevel}</span>
          </div>
        </PixelCard>

        {/* Card 2: Local Engine Status */}
        <PixelCard variant="default" className="p-4 sm:p-5 border-2 border-[var(--color-border)] space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[0.625rem] text-[var(--color-text-muted)] uppercase tracking-wider">
              <StyleText arcade="[02 // EXECUTION ENGINE]" clarity="Execution services" command="Service configuration" />
            </span>
            <span className="flex items-center gap-1.5 font-mono text-[0.625rem] text-[var(--color-accent)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] animate-pulse" />
              JUDGE PREVIEW
            </span>
          </div>
          <div className="space-y-1.5 text-xs font-mono">
            <div className="flex items-center justify-between">
              <span className="text-[var(--color-text-dim)]">Storage Locality:</span>
              <span className="text-[var(--color-mint)] font-bold">IndexedDB v2</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--color-text-dim)]">Execution Sandbox:</span>
              <span className="text-[var(--color-text-main)]">Piston adapter · unverified</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--color-text-dim)]">Automatic Judge:</span>
              <span className="text-[var(--color-accent)]">4 supported languages</span>
            </div>
          </div>
          <div className="pt-2 border-t border-[var(--color-border)]/60 flex items-center justify-between text-[0.6875rem] font-mono text-[var(--color-text-dim)]">
            <span>Runtime Security:</span>
            <span className="text-[var(--color-text-main)]">Sandbox required</span>
          </div>
        </PixelCard>

        {/* Card 3: Workspace Scratchpad Buffer */}
        <PixelCard variant="default" className="p-4 sm:p-5 border-2 border-[var(--color-border)] space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[0.625rem] text-[var(--color-text-muted)] uppercase tracking-wider">
              <StyleText arcade="[03 // BUFFER CACHE]" clarity="Your scratchpad" command="Active buffer" />
            </span>
            <PixelBadge variant="cyan" bracketed>
              {totalDrafts > 0 ? `${totalDrafts} DRAFT${totalDrafts > 1 ? "S" : ""}` : "READY"}
            </PixelBadge>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-heading text-base text-[var(--color-text-main)]">{filename}</span>
              <span className="text-[0.625rem] font-mono px-1.5 py-0.5 bg-[var(--color-elevated)] border border-[var(--color-border)] text-[var(--color-accent)]">
                ACTIVE
              </span>
            </div>
            <p className="font-mono text-[0.6875rem] text-[var(--color-text-dim)]">
              {activeDraft
                ? `Last modified: ${new Date(activeDraft.updatedAt).toLocaleTimeString()}`
                : "Starter template staged in local buffer"}
            </p>
          </div>
          <div className="pt-2 border-t border-[var(--color-border)]/60 flex items-center justify-between">
            <Link
              href="/app/workspace"
              className="text-xs font-mono text-[var(--color-accent)] hover:underline flex items-center gap-1 group"
            >
              <span>Open scratchpad</span>
              <span className="group-hover:translate-x-0.5 transition-transform">&rarr;</span>
            </Link>
          </div>
        </PixelCard>
      </div>

      {/* Track Blueprint Preview */}
      <section className="dashboard-recent modern-surface">
        <div className="flex items-center gap-2"><Terminal size={18} /><h2>Continue coding</h2></div>
        <p>{activeDraft ? `${filename} · Last saved ${new Date(activeDraft.updatedAt).toLocaleString()}` : "Your scratchpad is ready when you are."}</p>
        <pre><code>{activeDraft?.code ? activeDraft.code.split("\n").slice(0, 5).join("\n") : "// No saved code in this language yet."}</code></pre>
        <Link href="/app/workspace">Open {filename} <ArrowUpRight size={14} /></Link>
      </section>
      <PixelCard variant="elevated" className="dashboard-track p-5 sm:p-6 border-2 border-[var(--color-border)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--color-border)] pb-3">
          <div>
            <h2 className="font-heading text-lg text-[var(--color-text-main)] tracking-wide">
              <StyleText arcade={<>{LANGUAGE_DISPLAY_NAMES[profile.preferredLanguage].toUpperCase()} CURRICULUM BLUEPRINT_</>} clarity="Explore your learning track" command="Track reference" />
            </h2>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
              Verified roadmap for upcoming offline problem packages. No fabricated progression or false streaks.
            </p>
          </div>
          <PixelBadge variant="purple" bracketed>
            PHASE 2C PREVIEW
          </PixelBadge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {TRACK_MODULES.map((mod) => (
            <div
              key={mod.code}
              className="p-3.5 bg-[var(--color-canvas)] border border-[var(--color-border)] hover:border-[var(--color-primary)]/60 transition-colors space-y-2 group"
            >
              <div className="flex items-center justify-between">
                <span className="font-heading text-xs text-[var(--color-accent)]">
                  MODULE {mod.code}
                </span>
                <span className="font-mono text-[0.625rem] text-[var(--color-text-dim)]">
                  [STANDBY]
                </span>
              </div>
              <h3 className="font-heading text-sm text-[var(--color-text-main)] group-hover:text-[var(--color-accent)] transition-colors">
                {mod.title}
              </h3>
              <p className="text-[0.6875rem] text-[var(--color-text-muted)] leading-relaxed">
                {mod.desc}
              </p>
              <div className="pt-2 border-t border-[var(--color-border)]/40 flex items-center justify-between text-[0.625rem] font-mono text-[var(--color-text-dim)]">
                <span>Scope:</span>
                <span className="text-[var(--color-mint)]">{mod.topics}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-3 border-t border-[var(--color-border)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[var(--color-canvas)]/40 p-3">
          <div className="flex items-center gap-2 text-xs font-mono text-[var(--color-text-muted)]">
            <DotIcon name="box" size={16} color="var(--color-accent)" />
            <span>Multi-language practice problem catalog active. Sandboxed execution enabled.</span>
          </div>
          <Link href="/app/challenges">
            <PixelButton variant="ghost" size="sm">
              VIEW CHALLENGE LIBRARY →
            </PixelButton>
          </Link>
        </div>
      </PixelCard>

      {/* Profile Edit Dialog */}
      <ProfileEditDialog
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        profile={profile}
        onSave={async (updates) => {
          await updateProfile(profile.id, updates);
        }}
      />
    </div>
  );
}
