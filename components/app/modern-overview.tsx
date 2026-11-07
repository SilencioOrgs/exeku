"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DotIcon } from "@/components/retro/dot-icon";
import { Button, buttonVariants } from "@/components/ui/button";
import { ProfileEditDialog } from "./profile-edit-dialog";
import { CodingActivity } from "./coding-activity";
import { DifficultyBadge } from "./difficulty-badge";
import { tokenize } from "@/lib/syntax";
import { CircuitView } from "@/components/lab/circuit-view";
import { ClockView } from "@/components/lab/clock-view";
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
          <Link href="/app/lab" aria-label="Open the breadboard simulator" className="bg-grid block overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-canvas)]">
            <CircuitView ledOn interactive={false} view={[70, 85, 110]} className="pointer-events-none h-44" label="Arduino Uno and breadboard with a lit red LED" />
          </Link>
          <p className="text-sm text-[var(--color-text-muted)]">Blink an LED on a virtual Arduino, then see it become a finished, printable product.</p>
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

        <section aria-label="Finished build" className="skeuo-card tile-butter flex flex-col justify-between gap-3 rounded-2xl border border-[var(--color-border)] p-5">
          <div>
            <h2 className="text-lg font-semibold">Turn it into a product</h2>
            <p className="text-sm text-[var(--color-text-muted)]">A breadboard prototype, organized and printed: this desk clock is the first template.</p>
          </div>
          <Link href="/app/lab#chassis" aria-label="See the finished desk clock build" className="bg-grid block overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-canvas)]">
            <ClockView interactive={false} view={[95, 70, 130]} className="pointer-events-none h-40" label="Finished Arduino desk clock in an orange printed case, showing the time" />
          </Link>
          <Link href="/app/lab#chassis" className={buttonVariants({ variant: "outline", className: "w-full" })}><DotIcon name="box" size={15} aria-hidden="true" />See the finished build</Link>
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
