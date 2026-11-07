"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DotIcon } from "@/components/retro/dot-icon";
import { Button, buttonVariants } from "@/components/ui/button";
import { ProfileEditDialog } from "./profile-edit-dialog";
import { CodingActivity } from "./coding-activity";
import { DifficultyBadge } from "./difficulty-badge";
import { tokenize } from "@/lib/syntax";
import { BreadboardScene } from "@/components/lab/breadboard-scene";
import type { ProblemSummary } from "@/types/problem";
import { getFilenameForLanguage, getStarterCode } from "@/lib/workspace-defaults";
import type { LocalProfile, ProfileInput } from "@/types/profile";
import type { WorkspaceDraft } from "@/types/draft";

interface ModernOverviewProps {
  profile: LocalProfile;
  activeDraft: WorkspaceDraft | null;
  totalDrafts: number;
  onSaveProfile: (updates: Partial<ProfileInput>) => Promise<unknown>;
}

export function ModernOverview({ profile, activeDraft, totalDrafts, onSaveProfile }: ModernOverviewProps) {
  const [editing, setEditing] = useState(false);
  const [problems, setProblems] = useState<ProblemSummary[]>([]);
  useEffect(() => {
    let active = true;
    fetch("/api/problems")
      .then((response) => { if (!response.ok) throw new Error("Problem catalog unavailable"); return response.json(); })
      .then((data: { problems?: ProblemSummary[] }) => { if (active) setProblems((data.problems ?? []).slice(0, 3)); })
      .catch(() => { if (active) setProblems([]); });
    return () => { active = false; };
  }, []);
  const filename = getFilenameForLanguage(profile.preferredLanguage);

  return (
    <div className="modern-overview space-y-6">
      <header className="modern-page-header flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-[var(--color-primary-text)]">Your workspace</p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Welcome back, {profile.displayName}</h1>
          <p className="text-sm text-muted-foreground sm:text-base">Solve a problem, keep a streak of saved code, or try the Hardware Lab.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/app/challenges" className={buttonVariants({ variant: "default", size: "lg" })}>
            Browse problems <DotIcon name="arrowRight" aria-hidden="true" size={16} />
          </Link>
          <Link href="/app/workspace" className={buttonVariants({ variant: "outline", size: "lg" })}>
            Open editor <DotIcon name="vscode" aria-hidden="true" size={16} />
          </Link>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <section aria-label="Continue coding" className="skeuo-card tile-peach flex flex-col gap-3 rounded-2xl border border-[var(--color-border)] p-5 lg:col-span-2">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold">Continue coding</h2>
              <p className="text-sm text-[var(--color-text-muted)]">{filename} · {totalDrafts} saved {totalDrafts === 1 ? "draft" : "drafts"} on this device</p>
            </div>
            <Link href="/app/workspace" className={buttonVariants({ size: "sm" })}>Open editor</Link>
          </div>
          <pre data-theme-scope="dark" className="code-editor font-code min-h-24 flex-1 overflow-hidden rounded-xl p-3 text-xs leading-5 shadow-[var(--shadow-inset)]">{tokenize((activeDraft?.code?.trim() ? activeDraft.code : getStarterCode(profile.preferredLanguage)).split("\n").slice(0, 10).join("\n"), profile.preferredLanguage)
            .map((t, i) => t.type === "plain" ? t.text : <span key={i} className={`tok-${t.type}`}>{t.text}</span>)}</pre>
        </section>

        <section aria-label="Hardware Lab" className="skeuo-card tile-lavender flex flex-col gap-3 rounded-2xl border border-[var(--color-border)] p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Hardware Lab</h2>
            <span className="rounded-full bg-[var(--color-surface)] px-2 py-0.5 text-xs font-medium text-[var(--color-text-muted)]">Preview</span>
          </div>
          <Link href="/app/lab" aria-label="Open the breadboard simulator" className="block rounded-xl bg-[var(--color-surface)] p-2 shadow-[var(--shadow-inset)]">
            <BreadboardScene ledOn className="h-auto w-full" />
          </Link>
          <p className="text-sm text-[var(--color-text-muted)]">Blink an LED on a virtual Arduino, then preview a 3D-printable case for it.</p>
          <Link href="/app/lab" className={buttonVariants({ className: "w-full" })}><DotIcon name="play" size={15} aria-hidden="true" />Click to simulate</Link>
        </section>

        <section aria-label="Available programming problems" className="skeuo-card tile-mint flex flex-col gap-3 rounded-2xl border border-[var(--color-border)] p-5 lg:col-span-2">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div><h2 className="text-lg font-semibold">Start with a problem</h2><p className="text-sm text-[var(--color-text-muted)]">From the local problem set.</p></div>
            <Link href="/app/challenges" className="modern-card-link">View all <DotIcon name="arrowRight" aria-hidden="true" size={16} /></Link>
          </div>
          <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
            {problems.map((problem, i) => (
              <Link key={problem.id} href={`/app/workspace?problem=${encodeURIComponent(problem.id)}`} className="flex items-center gap-3 border-b border-[var(--color-border-subtle)] px-4 py-3 last:border-0 even:bg-[var(--color-canvas)] hover:bg-[color-mix(in_srgb,var(--color-primary)_8%,transparent)]">
                <span className="font-code w-5 text-sm text-[var(--color-text-muted)]">{i + 1}</span>
                <span className="min-w-0 flex-1"><strong className="block font-medium">{problem.title}</strong><span className="block text-xs text-[var(--color-text-muted)]">{problem.category}</span></span>
                <DifficultyBadge difficulty={problem.difficulty} />
              </Link>
            ))}
          </div>
        </section>

        <section aria-label="3D chassis" className="skeuo-card tile-butter flex flex-col justify-between gap-3 rounded-2xl border border-[var(--color-border)] p-5">
          <div>
            <h2 className="text-lg font-semibold">Print a case for it</h2>
            <p className="text-sm text-[var(--color-text-muted)]">Exeku sizes an enclosure around your breadboard project. Spin it in 3D.</p>
          </div>
          <svg viewBox="0 0 200 140" className="mx-auto h-32 w-auto" aria-hidden="true">
            {/* Isometric enclosure with its lid lifted. */}
            <g transform="translate(0 20)">
            <path d="M40 70 L100 100 L160 70 L100 40 Z" fill="#ffd9c2" stroke="#d9a07c" />
            <path d="M40 70 L40 88 L100 118 L100 100 Z" fill="#f2b08e" stroke="#d9a07c" />
            <path d="M160 70 L160 88 L100 118 L100 100 Z" fill="#e89b76" stroke="#d9a07c" />
            <path d="M62 70 L100 89 L138 70 L100 51 Z" fill="#2f9ea3" opacity="0.85" />
            <circle cx="118" cy="66" r="4" fill="#ff5a4f" />
            </g>
            <path d="M40 34 L100 64 L160 34 L100 4 Z" fill="#ffe8d6" stroke="#d9a07c" opacity="0.9" />
            <path d="M40 34 L40 40 L100 70 L100 64 Z" fill="#f2b08e" stroke="#d9a07c" />
            <path d="M160 34 L160 40 L100 70 L100 64 Z" fill="#e89b76" stroke="#d9a07c" />
          </svg>
          <Link href="/app/lab#chassis" className={buttonVariants({ variant: "outline", className: "w-full" })}><DotIcon name="box" size={15} aria-hidden="true" />Open 3D chassis</Link>
        </section>
      </div>

      <CodingActivity profileId={profile.id} />
      <footer className="modern-footnote flex flex-wrap items-center justify-between gap-3">
        <p><DotIcon name="shield" aria-hidden="true" size={16} /> Run and Submit need the local Piston sandbox. Exeku is in developer preview.</p>
        <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>Edit profile</Button>
      </footer>
      <ProfileEditDialog isOpen={editing} onClose={() => setEditing(false)} profile={profile} onSave={async (updates) => { await onSaveProfile(updates); }} />
    </div>
  );
}
