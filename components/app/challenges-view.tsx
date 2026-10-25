"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useProfile } from "@/hooks/use-profile";
import { useChallengeSession } from "@/hooks/use-challenge-session";
import { PixelCard } from "@/components/retro/pixel-card";
import { PixelButton } from "@/components/retro/pixel-button";
import { PixelBadge } from "@/components/retro/pixel-badge";
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
  { id: "all", label: "ALL TIERS" },
  { id: "beginner", label: "BEGINNER" },
  { id: "intermediate", label: "INTERMEDIATE" },
  { id: "advanced", label: "ADVANCED" },
];

export function ChallengesView() {
  const router = useRouter();
  const challenge = useChallengeSession();
  const { profile } = useProfile();
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

  return (
    <div className="challenges-view appearance-stack space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-[var(--color-border)] pb-4">
        <div>
          <h1 className="font-heading text-2xl text-[var(--color-text-main)] tracking-wide">
            PROGRAMMING PROBLEMS &amp; ASSESSMENTS_
          </h1>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            Choose a problem, write code, and test your solution in the workspace.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PixelBadge variant="mint" bracketed>
            Sandbox needed to run code
          </PixelBadge>
        </div>
      </div>

      {/* Active Timed Challenge Banner */}
      {challenge.isTimedActive && (
        <div className="p-3 bg-[var(--color-canvas)] border-2 border-[var(--color-accent)] flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 font-mono text-xs text-[var(--color-text-main)]">
            <DotIcon name="alarm" size={16} className="text-[var(--color-accent)] animate-pulse" />
            <span>
              ACTIVE CHALLENGE: <strong>{challenge.session?.problemTitle}</strong> ({challenge.formattedTime} left)
            </span>
          </div>
          <Link href={`/app/workspace?problem=${encodeURIComponent(challenge.session?.problemId ?? "")}`} className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] px-3 text-xs font-medium text-[var(--color-primary-foreground)] transition-colors hover:bg-[var(--color-primary-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]"><DotIcon name="arrowRight" size={14} aria-hidden="true" /> Resume Challenge</Link>
        </div>
      )}

      {/* Filter and Search Bar */}
      <PixelCard variant="default" className="p-4 border-2 border-[var(--color-border)] space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Language Selector */}
          <div className="space-y-1.5">
            <span className="font-mono text-[0.625rem] text-[var(--color-text-dim)] uppercase tracking-wider block">
              LANGUAGE FILTER:
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedLanguage("all")}
                className={`px-3 py-1.5 border font-mono text-xs transition-colors cursor-pointer ${
                  selectedLanguage === "all"
                    ? "bg-[var(--color-elevated)] border-[var(--color-accent)] text-[var(--color-accent)] [box-shadow:var(--shadow-btn)]"
                    : "bg-[var(--color-canvas)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]"
                }`}
              >
                ALL LANGUAGES
              </button>
              {ALL_SUPPORTED_LANGUAGES.map((lang) => {
                const isSelected = selectedLanguage === lang;
                return (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setSelectedLanguage(lang)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 border font-mono text-xs transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-[var(--color-elevated)] border-[var(--color-accent)] text-[var(--color-accent)] [box-shadow:var(--shadow-btn)]"
                        : "bg-[var(--color-canvas)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]"
                    }`}
                  >
                    <DotIcon
                      name={LANGUAGE_ICONS[lang]}
                      size={14}
                      color={isSelected ? "var(--color-accent)" : "var(--color-text-muted)"}
                    />
                    <span>{LANGUAGE_DISPLAY_NAMES[lang]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Difficulty Tier Filters */}
          <div className="space-y-1.5">
            <span className="font-mono text-[0.625rem] text-[var(--color-text-dim)] uppercase tracking-wider block">
              DIFFICULTY FILTER:
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {DIFFICULTY_TABS.map((tier) => {
                const isSelected = selectedTier === tier.id;
                return (
                  <button
                    key={tier.id}
                    type="button"
                    onClick={() => setSelectedTier(tier.id)}
                    className={`px-2.5 py-1.5 border font-mono text-[0.6875rem] transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-[var(--color-primary)]/20 border-[var(--color-primary)] text-[var(--color-text-main)] [box-shadow:var(--shadow-btn)]"
                        : "bg-[var(--color-canvas)] border-[var(--color-border)] text-[var(--color-text-dim)] hover:text-[var(--color-text-muted)]"
                    }`}
                  >
                    {tier.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Search Input Box */}
        <div className="pt-2 border-t border-[var(--color-border)]/60 flex items-center gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search problems by title, category, or tag (e.g. arithmetic, hello)..."
            className="flex-1 bg-[var(--color-canvas)] border border-[var(--color-border)] px-3 py-2 text-[var(--color-text-main)] font-mono text-xs focus:outline-none focus:border-[var(--color-accent)]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="text-xs font-mono text-[var(--color-text-dim)] hover:text-[var(--color-text-main)] px-2 py-1"
            >
              Clear
            </button>
          )}
        </div>
      </PixelCard>

      {/* Problem Cards Listing */}
      <div className="space-y-3">
        {problems.length === 0 ? (
          <PixelCard variant="default" className="p-8 text-center border-2 border-[var(--color-border)] space-y-2">
            <span className="font-heading text-lg text-[var(--color-text-main)]">NO PROBLEMS FOUND_</span>
            <p className="text-xs text-[var(--color-text-dim)] font-mono">
              Try adjusting your difficulty or search filters to find available practice problems.
            </p>
          </PixelCard>
        ) : (
          problems.map((prob) => {
            const diffVariant =
              prob.difficulty === "beginner"
                ? "mint"
                : prob.difficulty === "intermediate"
                ? "cyan"
                : "pink";

            return (
              <PixelCard
                key={prob.id}
                variant="elevated"
                className="p-4 sm:p-5 border-2 border-[var(--color-border)] hover:border-[var(--color-primary)]/80 transition-colors bg-[var(--color-surface)] space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h2 className="font-heading text-lg text-[var(--color-text-main)]">
                        {prob.title}_
                      </h2>
                      <PixelBadge variant={diffVariant} bracketed>
                        {prob.difficulty.toUpperCase()}
                      </PixelBadge>
                      <span className="font-mono text-xs text-[var(--color-text-dim)]">
                        [{prob.category}]
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-mono text-[var(--color-text-muted)]">
                      <span>{prob.totalTestsCount} test cases</span>
                      <span>&bull;</span>
                      <span>{prob.sampleCount} visible sample{prob.sampleCount === 1 ? "" : "s"}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <PixelButton
                      variant="ghost"
                      size="sm"
                      onClick={() => setInspectProblemId(prob.id)}
                      className="text-xs"
                    >
                      <DotIcon name="book" size={14} aria-hidden="true" /> Statement
                    </PixelButton>

                    <button
                      type="button"
                      onClick={() => handleStartTimedChallenge(prob.id, prob.title)}
                      className="px-2.5 py-1.5 border border-[var(--color-pink)] text-[var(--color-pink)] hover:bg-[var(--color-pink)]/10 font-heading text-xs cursor-pointer transition-colors flex items-center gap-1"
                      title="Start a 15-minute timed challenge session"
                    >
                      <DotIcon name="alarm" size={14} aria-hidden="true" />
                      <span>Timed</span>
                    </button>

                    <Link href={`/app/workspace?problem=${encodeURIComponent(prob.id)}`} className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] px-3 text-xs font-medium text-[var(--color-primary-foreground)] transition-colors hover:bg-[var(--color-primary-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]"><DotIcon name="circlePlay" size={14} aria-hidden="true" /> Solve</Link>
                  </div>
                </div>

                {/* Tags & Languages */}
                <div className="pt-2 border-t border-[var(--color-border)]/60 flex items-center justify-between flex-wrap gap-2 text-[0.6875rem] font-mono">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[var(--color-text-dim)]">Supported:</span>
                    {prob.supportedLanguages.map((l) => (
                      <span
                        key={l}
                        className={`px-1.5 py-0.5 border text-[0.625rem] ${
                          profile?.preferredLanguage === l
                            ? "border-[var(--color-accent)] text-[var(--color-accent)] bg-[var(--color-accent)]/10 font-bold"
                            : "border-[var(--color-border)] text-[var(--color-text-muted)] bg-[var(--color-canvas)]"
                        }`}
                      >
                        {LANGUAGE_DISPLAY_NAMES[l]}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-1 text-[var(--color-text-dim)]">
                    {prob.tags.map((t) => (
                      <span key={t}>#{t}</span>
                    ))}
                  </div>
                </div>
              </PixelCard>
            );
          })
        )}
      </div>

      {/* Problem Statement Modal / Drawer */}
      {activeProblemDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <PixelCard
            variant="elevated"
            className="w-full max-w-2xl border-2 border-[var(--color-accent)] p-6 bg-[var(--color-surface)] [box-shadow:var(--shadow-btn)] space-y-4 max-h-[85vh] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <h3 className="font-heading text-xl text-[var(--color-text-main)]">
                  {activeProblemDetail.title}_
                </h3>
                <PixelBadge
                  variant={
                    activeProblemDetail.difficulty === "beginner"
                      ? "mint"
                      : activeProblemDetail.difficulty === "intermediate"
                      ? "cyan"
                      : "pink"
                  }
                  bracketed
                >
                  {activeProblemDetail.difficulty.toUpperCase()}
                </PixelBadge>
              </div>

              <button
                type="button"
                onClick={() => setInspectProblemId(null)}
                className="text-[var(--color-text-dim)] hover:text-[var(--color-text-main)] font-mono text-sm cursor-pointer"
              >
                <DotIcon name="close" size={14} aria-hidden="true" /> CLOSE
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto space-y-4 text-xs font-mono pr-2">
              <div className="space-y-1">
                <span className="text-[var(--color-accent)] font-heading text-sm block">PROBLEM DESCRIPTION</span>
                <p className="text-[var(--color-text-main)] leading-relaxed font-sans text-sm">
                  {activeProblemDetail.description}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[var(--color-accent)] font-heading text-sm block">INPUT SPECIFICATION</span>
                <p className="text-[var(--color-text-muted)] bg-[var(--color-canvas)] p-2.5 border border-[var(--color-border)]">
                  {activeProblemDetail.inputSpec}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[var(--color-accent)] font-heading text-sm block">OUTPUT SPECIFICATION</span>
                <p className="text-[var(--color-text-muted)] bg-[var(--color-canvas)] p-2.5 border border-[var(--color-border)]">
                  {activeProblemDetail.outputSpec}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[var(--color-accent)] font-heading text-sm block">CONSTRAINTS</span>
                <ul className="list-disc list-inside text-[var(--color-text-muted)] space-y-0.5">
                  {activeProblemDetail.constraints.map((c, idx) => (
                    <li key={idx}>{c}</li>
                  ))}
                  <li>Time Limit: {activeProblemDetail.timeLimitMs}ms</li>
                  <li>Memory Limit: {Math.round(activeProblemDetail.memoryLimitKb / 1000)}MB</li>
                </ul>
              </div>

              {/* Sample Test Cases */}
              <div className="space-y-2">
                <span className="text-[var(--color-accent)] font-heading text-sm block">SAMPLE TEST CASES</span>
                {activeProblemDetail.sampleTestCases.map((s, idx) => (
                  <div key={idx} className="p-3 bg-[var(--color-canvas)] border border-[var(--color-border)] space-y-1">
                    <span className="text-[var(--color-text-main)] font-bold block">Sample #{idx + 1}</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[0.6875rem]">
                      <div>
                        <span className="text-[var(--color-text-dim)] block">Input:</span>
                        <pre className="text-[var(--color-text-main)] bg-[var(--color-surface)] p-1.5 border border-[var(--color-border)]">
                          {s.input || "(empty)"}
                        </pre>
                      </div>
                      <div>
                        <span className="text-[var(--color-text-dim)] block">Output:</span>
                        <pre className="text-[var(--color-mint)] bg-[var(--color-surface)] p-1.5 border border-[var(--color-border)]">
                          {s.output.trim()}
                        </pre>
                      </div>
                    </div>
                    {s.explanation && (
                      <p className="text-[0.625rem] text-[var(--color-text-dim)] pt-1">
                        Explanation: {s.explanation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-[var(--color-border)] flex items-center justify-between shrink-0">
              <span className="text-[0.6875rem] font-mono text-[var(--color-text-dim)]">
                {activeProblemDetail.visibleTestCases.length} visible test cases ready
              </span>

              <div className="flex items-center gap-2">
                <PixelButton
                  variant="ghost"
                  size="sm"
                  onClick={() => setInspectProblemId(null)}
                >
                  CLOSE
                </PixelButton>

                <button
                  type="button"
                  onClick={() => {
                    handleStartTimedChallenge(activeProblemDetail.id, activeProblemDetail.title);
                    setInspectProblemId(null);
                  }}
                  className="px-3 py-1.5 border border-[var(--color-pink)] text-[var(--color-pink)] hover:bg-[var(--color-pink)]/10 font-heading text-xs cursor-pointer transition-colors flex items-center gap-1.5"
                >
                  <DotIcon name="alarm" size={13} />
                  <span>START TIMED CHALLENGE <DotIcon name="alarm" size={14} aria-hidden="true" /></span>
                </button>

                <Link href={`/app/workspace?problem=${encodeURIComponent(activeProblemDetail.id)}`} className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] px-3 text-xs font-medium text-[var(--color-primary-foreground)] transition-colors hover:bg-[var(--color-primary-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]"><DotIcon name="circlePlay" size={14} aria-hidden="true" /> Solve In Workspace</Link>
              </div>
            </div>
          </PixelCard>
        </div>
      )}
    </div>
  );
}
