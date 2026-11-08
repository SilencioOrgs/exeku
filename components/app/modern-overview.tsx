"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DotIcon } from "@/components/retro/dot-icon";
import { Button, buttonVariants } from "@/components/ui/button";
import { ProfileEditDialog } from "./profile-edit-dialog";
import { CodingActivity } from "./coding-activity";
import { DifficultyBadge } from "./difficulty-badge";
import { useChallengeSession } from "@/hooks/use-challenge-session";
import { LabAppStrip } from "@/components/lab/lab-app-banner";
import { tokenize } from "@/lib/syntax";
import type { ProblemSummary } from "@/types/problem";
import { getFilenameForLanguage, getStarterCode, LANGUAGE_DISPLAY_NAMES } from "@/lib/workspace-defaults";
import type { LocalProfile, ProfileInput } from "@/types/profile";
import type { WorkspaceDraft } from "@/types/draft";

interface ModernOverviewProps {
  profile: LocalProfile;
  activeDraft: WorkspaceDraft | null;
  totalDrafts: number;
  onSaveProfile: (updates: Partial<ProfileInput>) => Promise<unknown>;
}

const TIERS = [
  { id: "beginner", label: "Easy", tone: "easy" },
  { id: "intermediate", label: "Medium", tone: "medium" },
  { id: "advanced", label: "Hard", tone: "hard" },
] as const;

/** Competitive programming home: the problem set, a timed round and where you left off. */
export function ModernOverview({ profile, activeDraft, totalDrafts, onSaveProfile }: ModernOverviewProps) {
  const router = useRouter();
  const challenge = useChallengeSession();
  const [editing, setEditing] = useState(false);
  const [problems, setProblems] = useState<ProblemSummary[] | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/problems")
      .then((response) => { if (!response.ok) throw new Error("Problem catalog unavailable"); return response.json(); })
      .then((data: { problems?: ProblemSummary[] }) => { if (active) setProblems(data.problems ?? []); })
      .catch(() => { if (active) setProblems([]); });
    return () => { active = false; };
  }, []);

  const counts = useMemo(() => Object.fromEntries(TIERS.map((t) => [t.id, (problems ?? []).filter((p) => p.difficulty === t.id).length])), [problems]);
  // Suggest a timed round at the student's level, falling back to the first problem.
  const roundProblem = useMemo(() => (problems ?? []).find((p) => p.difficulty === profile.experienceLevel) ?? problems?.[0], [problems, profile.experienceLevel]);
  const startRound = (problem: ProblemSummary) => {
    challenge.startChallenge(problem.id, problem.title);
    router.push(`/app/workspace?problem=${encodeURIComponent(problem.id)}`);
  };
  const filename = getFilenameForLanguage(profile.preferredLanguage);
  const code = (activeDraft?.code?.trim() ? activeDraft.code : getStarterCode(profile.preferredLanguage)).split("\n").slice(0, 7).join("\n");

  return (
    <div className="modern-overview space-y-6">
      <header className="modern-page-header flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1.5">
          <h1 className="text-3xl font-semibold tracking-tight">Welcome back, {profile.displayName}</h1>
          <p className="text-sm text-[var(--color-text-muted)] sm:text-base">Pick a problem, beat the clock, get it Accepted.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/app/challenges" className={buttonVariants({ size: "lg" })}>
            Browse problems<DotIcon name="arrowRight" aria-hidden="true" size={16} />
          </Link>
          <Link href="/app/workspace" className={buttonVariants({ variant: "outline", size: "lg" })}>
            <DotIcon name="vscode" aria-hidden="true" size={16} />Open editor
          </Link>
        </div>
      </header>

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="skeuo-card rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <dt className="text-xs text-[var(--color-text-muted)]">Problems</dt>
          <dd className="font-code mt-1 text-2xl font-semibold">{problems ? problems.length : "…"}</dd>
        </div>
        {TIERS.map((tier) => (
          <div key={tier.id} className="skeuo-card rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <dt className="text-xs font-medium" style={{ color: `var(--color-${tier.tone})` }}>{tier.label}</dt>
            <dd className="font-code mt-1 text-2xl font-semibold">{problems ? counts[tier.id] : "…"}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-4 lg:grid-cols-3">
        <section aria-labelledby="problem-set-heading" className="skeuo-card overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] lg:col-span-2">
          <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border)] px-4 py-3">
            <h2 id="problem-set-heading" className="font-semibold">Problem set</h2>
            <Link href="/app/challenges" className={buttonVariants({ variant: "ghost", size: "sm" })}>View all<DotIcon name="arrowRight" aria-hidden="true" size={14} /></Link>
          </div>
          {problems === null ? (
            <p className="px-4 py-6 text-sm text-[var(--color-text-muted)]">Loading problems…</p>
          ) : problems.length === 0 ? (
            <p className="px-4 py-6 text-sm text-[var(--color-text-muted)]">The problem catalog is unavailable right now.</p>
          ) : (
            <ol>
              {problems.slice(0, 6).map((problem, i) => (
                <li key={problem.id} className="flex items-center gap-3 border-b border-[var(--color-border-subtle)] px-4 py-2.5 last:border-0 even:bg-[var(--color-canvas)]/40">
                  <span className="font-code w-5 text-sm text-[var(--color-text-muted)]">{i + 1}</span>
                  <Link href={`/app/workspace?problem=${encodeURIComponent(problem.id)}`} className="min-w-0 flex-1 hover:text-[var(--color-primary-text)]">
                    <span className="block truncate font-medium">{problem.title}</span>
                    <span className="block truncate text-xs text-[var(--color-text-muted)]">{problem.category} · {problem.totalTestsCount} tests</span>
                  </Link>
                  <DifficultyBadge difficulty={problem.difficulty} />
                  <Button type="button" variant="outline" size="icon-sm" onClick={() => startRound(problem)} aria-label={`Start a timed round on ${problem.title}`} title="Timed round">
                    <DotIcon name="alarm" size={14} aria-hidden="true" />
                  </Button>
                </li>
              ))}
            </ol>
          )}
        </section>

        <div className="flex flex-col gap-4">
          <section aria-labelledby="round-heading" className="skeuo-card tile-peach flex flex-col gap-3 rounded-xl border border-[var(--color-border)] p-4">
            <div className="flex items-center gap-2">
              <DotIcon name="alarm" size={18} aria-hidden="true" className="text-[var(--color-primary-text)]" />
              <h2 id="round-heading" className="font-semibold">Timed round</h2>
            </div>
            {challenge.isTimedActive ? (
              <>
                <p className="text-sm text-[var(--color-text-muted)]">In progress: <strong className="text-[var(--color-text-main)]">{challenge.session?.problemTitle}</strong></p>
                <p className="font-code text-3xl font-semibold">{challenge.formattedTime}</p>
                <Link href={`/app/workspace?problem=${encodeURIComponent(challenge.session?.problemId ?? "")}`} className={buttonVariants({ className: "w-full" })}>Back to the round</Link>
              </>
            ) : (
              <>
                <p className="text-sm text-[var(--color-text-muted)]">15 minutes on the clock and hidden tests on submit, like a contest.</p>
                {roundProblem && (
                  <p className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate font-medium">{roundProblem.title}</span>
                    <DifficultyBadge difficulty={roundProblem.difficulty} />
                  </p>
                )}
                <Button type="button" className="w-full" disabled={!roundProblem} onClick={() => roundProblem && startRound(roundProblem)}>
                  <DotIcon name="play" size={15} aria-hidden="true" />Start timed round
                </Button>
              </>
            )}
          </section>

          <section aria-labelledby="continue-heading" className="skeuo-card flex flex-1 flex-col gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h2 id="continue-heading" className="font-semibold">Continue coding</h2>
                <p className="truncate text-xs text-[var(--color-text-muted)]">{filename} · {LANGUAGE_DISPLAY_NAMES[profile.preferredLanguage]} · {totalDrafts} {totalDrafts === 1 ? "draft" : "drafts"}</p>
              </div>
              <Link href="/app/workspace" className={buttonVariants({ variant: "outline", size: "sm" })}>Open</Link>
            </div>
            <pre className="code-editor font-code flex-1 overflow-hidden rounded-lg p-3 text-xs leading-5">{tokenize(code, profile.preferredLanguage)
              .map((t, i) => t.type === "plain" ? t.text : <span key={i} className={`tok-${t.type}`}>{t.text}</span>)}</pre>
          </section>
        </div>
      </div>

      <LabAppStrip />

      <CodingActivity profileId={profile.id} />
      <footer className="modern-footnote flex flex-wrap items-center justify-between gap-3">
        <p><DotIcon name="shield" aria-hidden="true" size={16} /> Run and Submit need the local Piston sandbox.</p>
        <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>Edit profile</Button>
      </footer>
      <ProfileEditDialog isOpen={editing} onClose={() => setEditing(false)} profile={profile} onSave={async (updates) => { await onSaveProfile(updates); }} />
    </div>
  );
}
