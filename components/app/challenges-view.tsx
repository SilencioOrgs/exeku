"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useChallengeSession } from "@/hooks/use-challenge-session";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DifficultyBadge, difficultyLabel } from "./difficulty-badge";
import { cn } from "@/lib/utils";
import { DotIcon, type DotIconName } from "@/components/retro/dot-icon";

import {
  ALL_SUPPORTED_LANGUAGES,
  LANGUAGE_DISPLAY_NAMES,
} from "@/lib/workspace-defaults";

import type { PreferredLanguage } from "@/types/profile";
import type { ProblemDifficulty, ProblemSummary, VisibleProblem } from "@/types/problem";

type FilterTier = "all" | ProblemDifficulty;

const LANGUAGE_ICONS: Record<PreferredLanguage, DotIconName> = {
  python: "python",
  java: "java",
  cpp: "cplusplus",
  c: "file",
};

const DIFFICULTY_TABS: { id: FilterTier; label: string }[] = [
  { id: "all", label: "All" },
  { id: "beginner", label: "Beginner" },
  { id: "intermediate", label: "Intermediate" },
  { id: "advanced", label: "Advanced" },
];

export function ChallengesView() {
  const router = useRouter();
  const challenge = useChallengeSession();
  const [selectedLanguage, setSelectedLanguage] = useState<PreferredLanguage | "all">("all");
  const [selectedTier, setSelectedTier] = useState<FilterTier>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [inspectProblemId, setInspectProblemId] = useState<string | null>(null);
  const [problems, setProblems] = useState<ProblemSummary[]>([]);
  const [loadedProblem, setLoadedProblem] = useState<{ id: string; detail: VisibleProblem } | null>(null);
  const activeProblemDetail = loadedProblem?.id === inspectProblemId ? loadedProblem.detail : null;

  const handleStartTimedChallenge = (problemId: string, problemTitle: string) => {
    challenge.startChallenge(problemId, problemTitle);
    router.push(`/app/workspace?problem=${encodeURIComponent(problemId)}`);
  };

  // Always load public, redacted metadata through the API. Never ship server test cases.
  useEffect(() => {
    let active = true;
    const query = new URLSearchParams();
    if (selectedTier !== "all") query.set("difficulty", selectedTier);
    if (selectedLanguage !== "all") query.set("language", selectedLanguage);
    if (searchQuery.trim()) query.set("search", searchQuery.trim());
    fetch(`/api/problems?${query.toString()}`)
      .then((response) => {
        if (!response.ok) throw new Error("Unable to load problems");
        return response.json();
      })
      .then((data: { problems?: ProblemSummary[] }) => {
        if (active) setProblems(data.problems ?? []);
      })
      .catch(() => { if (active) setProblems([]); });
    return () => { active = false; };
  }, [selectedTier, selectedLanguage, searchQuery]);

  useEffect(() => {
    let active = true;
    if (inspectProblemId) {
      fetch(`/api/problems/${encodeURIComponent(inspectProblemId)}`)
        .then((response) => {
          if (!response.ok) throw new Error("Unable to load problem");
          return response.json();
        })
        .then((data: VisibleProblem) => { if (active) setLoadedProblem({ id: inspectProblemId!, detail: data }); })
        .catch(() => { if (active) setLoadedProblem(null); });
    }
    return () => { active = false; };
  }, [inspectProblemId]);

  const chip = (active: boolean) => cn(
    "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors",
    active ? "skeuo-key border-[var(--color-primary-edge)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)]" : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]",
  );
  const counts = { beginner: 0, intermediate: 0, advanced: 0 } as Record<string, number>;
  problems.forEach((p) => { counts[p.difficulty] = (counts[p.difficulty] ?? 0) + 1; });

  return (
    <div className="challenges-view space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Problems</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">Pick a problem, write your solution, and submit it for judging.</p>
        </div>
        <div className="flex gap-2" aria-label="Problems by difficulty">
          {(["beginner", "intermediate", "advanced"] as const).map((d) => (
            <div key={d} className="skeuo-card flex min-w-20 flex-col items-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2">
              <DifficultyBadge difficulty={d} />
              <span className="font-code mt-1 text-lg font-semibold">{counts[d] ?? 0}</span>
            </div>
          ))}
        </div>
      </div>

      {challenge.isTimedActive && (
        <div className="tile-butter skeuo-card flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] p-3 text-sm">
          <span className="flex items-center gap-2">
            <DotIcon name="alarm" size={16} aria-hidden="true" />
            Timed challenge in progress: <strong>{challenge.session?.problemTitle}</strong>
            <span className="font-code">{challenge.formattedTime} left</span>
          </span>
          <Link href={`/app/workspace?problem=${encodeURIComponent(challenge.session?.problemId ?? "")}`} className={buttonVariants({ size: "sm" })}>Resume</Link>
        </div>
      )}

      <div className="skeuo-card space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative grow basis-full sm:basis-64">
            <DotIcon name="search" size={15} aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              type="search"
              aria-label="Search problems"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, topic or tag"
              className="h-9 w-full rounded-full border border-[var(--color-border)] pr-3 pl-9 text-sm"
            />
          </div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Difficulty">
            {DIFFICULTY_TABS.map((tier) => (
              <button key={tier.id} type="button" aria-pressed={selectedTier === tier.id} onClick={() => setSelectedTier(tier.id)} className={chip(selectedTier === tier.id)}>
                {tier.id === "all" ? tier.label : difficultyLabel(tier.id)}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Language">
          <button type="button" aria-pressed={selectedLanguage === "all"} onClick={() => setSelectedLanguage("all")} className={chip(selectedLanguage === "all")}>All languages</button>
          {ALL_SUPPORTED_LANGUAGES.map((lang) => (
            <button key={lang} type="button" aria-pressed={selectedLanguage === lang} onClick={() => setSelectedLanguage(lang)} className={chip(selectedLanguage === lang)}>
              <DotIcon name={LANGUAGE_ICONS[lang]} size={13} aria-hidden="true" />{LANGUAGE_DISPLAY_NAMES[lang]}
            </button>
          ))}
        </div>
      </div>

      <div className="skeuo-card overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        {problems.length === 0 ? (
          <div className="p-10 text-center">
            <p className="font-semibold">No problems match</p>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">Try another difficulty, language or search.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-[var(--color-border)] text-left text-xs text-[var(--color-text-muted)]">
              <tr>
                <th scope="col" className="w-12 px-4 py-2.5 font-medium">#</th>
                <th scope="col" className="px-2 py-2.5 font-medium">Title</th>
                <th scope="col" className="hidden px-2 py-2.5 font-medium md:table-cell">Topic</th>
                <th scope="col" className="px-2 py-2.5 font-medium">Difficulty</th>
                <th scope="col" className="hidden px-2 py-2.5 font-medium lg:table-cell">Tests</th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {problems.map((prob, index) => (
                <tr key={prob.id} className="border-b border-[var(--color-border-subtle)] last:border-0 even:bg-[var(--color-canvas)] hover:bg-[color-mix(in_srgb,var(--color-primary)_8%,transparent)]">
                  <td className="font-code px-4 py-3 text-[var(--color-text-muted)]">{index + 1}</td>
                  <td className="px-2 py-3">
                    <Link href={`/app/workspace?problem=${encodeURIComponent(prob.id)}`} className="font-medium hover:text-[var(--color-primary-text)] hover:underline">{prob.title}</Link>
                    <div className="mt-0.5 flex flex-wrap gap-1 text-xs text-[var(--color-text-muted)]">
                      {prob.tags.map((t) => <span key={t} className="rounded-full bg-[var(--color-elevated)] px-1.5">{t}</span>)}
                    </div>
                  </td>
                  <td className="hidden px-2 py-3 text-[var(--color-text-muted)] md:table-cell">{prob.category}</td>
                  <td className="px-2 py-3"><DifficultyBadge difficulty={prob.difficulty} /></td>
                  <td className="font-code hidden px-2 py-3 text-[var(--color-text-muted)] lg:table-cell">{prob.totalTestsCount}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1.5">
                      <Button type="button" variant="ghost" size="sm" onClick={() => setInspectProblemId(prob.id)}>
                        <DotIcon name="book" size={14} aria-hidden="true" /><span className="hidden sm:inline">Read</span>
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => handleStartTimedChallenge(prob.id, prob.title)} title="Start a 15-minute timed challenge">
                        <DotIcon name="alarm" size={14} aria-hidden="true" /><span className="hidden sm:inline">Timed</span>
                      </Button>
                      <Link href={`/app/workspace?problem=${encodeURIComponent(prob.id)}`} className={buttonVariants({ size: "sm" })}>Solve</Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {activeProblemDetail && (
        <Dialog open onOpenChange={(open) => { if (!open) setInspectProblemId(null); }}>
          <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <div className="flex items-center gap-2"><DialogTitle className="text-lg">{activeProblemDetail.title}</DialogTitle><DifficultyBadge difficulty={activeProblemDetail.difficulty} /></div>
              <DialogDescription>{activeProblemDetail.category} · {activeProblemDetail.timeLimitMs} ms · {Math.round(activeProblemDetail.memoryLimitKb / 1000)} MB</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <p className="leading-relaxed">{activeProblemDetail.description}</p>
              <div><h4 className="font-semibold">Input</h4><p className="text-[var(--color-text-muted)]">{activeProblemDetail.inputSpec}</p></div>
              <div><h4 className="font-semibold">Output</h4><p className="text-[var(--color-text-muted)]">{activeProblemDetail.outputSpec}</p></div>
              <div><h4 className="font-semibold">Constraints</h4><ul className="list-disc pl-5 text-[var(--color-text-muted)]">{activeProblemDetail.constraints.map((c, idx) => <li key={idx}>{c}</li>)}</ul></div>
              {activeProblemDetail.sampleTestCases.map((sample, idx) => (
                <div key={idx} className="grid gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-canvas)] p-2.5 sm:grid-cols-2">
                  <div><span className="text-xs text-[var(--color-text-muted)]">Sample {idx + 1} input</span><pre className="font-code whitespace-pre-wrap text-xs">{sample.input || "(empty)"}</pre></div>
                  <div><span className="text-xs text-[var(--color-text-muted)]">Expected output</span><pre className="font-code whitespace-pre-wrap text-xs">{sample.output.trim()}</pre></div>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { handleStartTimedChallenge(activeProblemDetail.id, activeProblemDetail.title); setInspectProblemId(null); }}>
                <DotIcon name="alarm" size={14} aria-hidden="true" />Start timed
              </Button>
              <Link href={`/app/workspace?problem=${encodeURIComponent(activeProblemDetail.id)}`} className={buttonVariants()}>Solve</Link>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
