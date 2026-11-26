"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlarmClock, BookOpen, FileText, GraduationCap, Search } from "lucide-react";
import { Select } from "@/components/ui/select";
import { useChallengeSession } from "@/hooks/use-challenge-session";
import { Button, buttonVariants } from "@/components/ui/button";
import { call, peekApiCache } from "@/lib/accounts/api";
import { subscribeClientCache } from "@/lib/client/swr-cache";
import { inTopic, SORT_OPTIONS, sortProblems, type SortId, type TopicId } from "@/lib/problems/topics";
import { ALL_SUPPORTED_LANGUAGES, LANGUAGE_DISPLAY_NAMES } from "@/lib/workspace-defaults";
import type { PreferredLanguage } from "@/types/profile";
import type { ProblemDifficulty, ProblemSummary } from "@/types/problem";
import { DifficultyBadge, difficultyLabel } from "./difficulty-badge";
import { TopicFilter } from "./topic-filter";
import { ChallengesTableSkeleton } from "./page-skeletons";

const DIFFICULTIES: ProblemDifficulty[] = ["beginner", "intermediate", "advanced"];

function FilterSelect({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode }) {
  return <Select aria-label={label} value={value} onChange={onChange} className="h-9">{children}</Select>;
}

export function ChallengesView() {
  const router = useRouter();
  const challenge = useChallengeSession();
  const [language, setLanguage] = useState<PreferredLanguage | "all">("all");
  const [difficulty, setDifficulty] = useState<ProblemDifficulty | "all">("all");
  const [topic, setTopic] = useState<TopicId>("all");
  const [sort, setSort] = useState<SortId>("default");
  const [searchQuery, setSearchQuery] = useState("");
  const [problems, setProblems] = useState<ProblemSummary[] | null>(
    () => peekApiCache<{ problems?: ProblemSummary[] }>("/api/problems")?.problems ?? null,
  );

  const startTimed = (problem: ProblemSummary) => {
    const targetHref = `/app/workspace?problem=${encodeURIComponent(problem.id)}`;
    if (challenge.isTimedActive && challenge.session?.problemId !== problem.id) {
      if (!challenge.requestNavigation(targetHref)) return;
    }
    challenge.startChallenge(problem.id, problem.title);
    router.push(targetHref);
  };

  // Always load public, redacted metadata through the API. Never ship server test cases.
  useEffect(() => {
    let active = true;
    const load = () => void call<{ problems?: ProblemSummary[] }>("/api/problems").then((res) => {
      if (!active) return;
      if (res.ok) setProblems(res.data.problems ?? []);
      else setProblems((prev) => prev ?? []);
    });
    load();
    const unsubscribe = subscribeClientCache((prefixes) => {
      if (prefixes.some((p) => p === "*" || p.startsWith("/api/problems"))) load();
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const visible = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = (problems ?? []).filter((p) => {
      if (difficulty !== "all" && p.difficulty !== difficulty) return false;
      if (language !== "all" && !p.supportedLanguages.includes(language)) return false;
      if (!inTopic(p, topic)) return false;
      if (q) {
        const hay = `${p.title} ${p.category} ${p.tags.join(" ")}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    return sortProblems(filtered, sort);
  }, [problems, difficulty, language, topic, searchQuery, sort]);
  const noFiltersApplied = difficulty === "all" && language === "all" && topic === "all" && !searchQuery.trim();

  return (
    <div className="challenges-view space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Problems</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Solve coding problems from Easy to Hard and submit your own solutions to the sandbox judge.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href="/app/docs" className={buttonVariants({ variant: "outline", size: "sm" })}>
            <FileText size={14} aria-hidden="true" /> Language Docs
          </Link>
          <Link href="/app/learn" className={buttonVariants({ variant: "outline", size: "sm" })}>
            <BookOpen size={14} aria-hidden="true" /> Tutorials
          </Link>
        </div>
      </div>

      {challenge.isTimedActive && (
        <div className="tile-butter skeuo-card flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] p-3 text-sm">
          <span className="flex items-center gap-2">
            <AlarmClock size={16} aria-hidden="true" />
            Timed challenge in progress: <strong>{challenge.session?.problemTitle}</strong>
            <span className="font-code">{challenge.formattedTime} left</span>
          </span>
          <Link href={`/app/workspace?problem=${encodeURIComponent(challenge.session?.problemId ?? "")}`} className={buttonVariants({ size: "sm" })}>Resume</Link>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <TopicFilter problems={problems ?? []} selected={topic} onSelect={setTopic} />
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by difficulty tier">
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-pressed={difficulty === "all"}
            onClick={() => setDifficulty("all")}
          >
            All levels
          </Button>
          {DIFFICULTIES.map((d) => (
            <Button
              key={d}
              type="button"
              variant="outline"
              size="sm"
              aria-pressed={difficulty === d}
              onClick={() => setDifficulty(d)}
            >
              {difficultyLabel(d)}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_auto_auto]">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Search size={15} aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input type="search" aria-label="Search problems" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search problems, categories, or labels" className="skeuo-well h-9 w-full rounded-lg border border-input pr-3 pl-9 text-sm" />
        </div>
        <FilterSelect label="Language" value={language} onChange={(v) => setLanguage(v as PreferredLanguage | "all")}>
          <option value="all">All languages</option>
          {ALL_SUPPORTED_LANGUAGES.map((lang) => <option key={lang} value={lang}>{LANGUAGE_DISPLAY_NAMES[lang]}</option>)}
        </FilterSelect>
        <FilterSelect label="Sort problems" value={sort} onChange={(v) => setSort(v as SortId)}>
          {SORT_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
        </FilterSelect>
      </div>

      <div className="skeuo-card overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        {problems === null ? (
          <ChallengesTableSkeleton />
        ) : visible.length === 0 ? (
          <div className="space-y-4 p-8 text-center">
            <div className="space-y-1">
              <p className="font-semibold">
                {noFiltersApplied ? "No problems posted yet" : "No problems match your filters"}
              </p>
              <p className="mx-auto max-w-md text-xs text-[var(--color-text-muted)]">
                {noFiltersApplied
                  ? "Teachers and tournament organizers publish coding problems here. In the meantime, explore the language reference docs or interactive tutorials."
                  : "Try another topic, difficulty, language, or search term."}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Link href="/app/learn" className={buttonVariants({ size: "sm" })}>
                <BookOpen size={14} aria-hidden="true" /> Open Learn tutorials
              </Link>
              <Link href="/app/docs" className={buttonVariants({ variant: "outline", size: "sm" })}>
                <FileText size={14} aria-hidden="true" /> Language docs
              </Link>
              <Link href="/app/classes" className={buttonVariants({ variant: "outline", size: "sm" })}>
                <GraduationCap size={14} aria-hidden="true" /> Go to classes
              </Link>
            </div>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-[var(--color-border)] text-left text-xs text-[var(--color-text-muted)]">
              <tr>
                <th scope="col" className="w-12 px-4 py-2.5 font-medium">#</th>
                <th scope="col" className="px-2 py-2.5 font-medium">Title &amp; labels</th>
                <th scope="col" className="px-2 py-2.5 font-medium">Difficulty</th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((problem, index) => (
                <tr key={problem.id} className="border-b border-[var(--color-border-subtle)] last:border-0 even:bg-[var(--color-canvas)] hover:bg-[color-mix(in_srgb,var(--color-primary)_8%,transparent)]">
                  <td className="font-code px-4 py-3 text-[var(--color-text-muted)]">{index + 1}</td>
                  <td className="px-2 py-3">
                    <Link href={`/app/workspace?problem=${encodeURIComponent(problem.id)}`} className="font-medium hover:text-[var(--color-primary-text)] hover:underline">{problem.title}</Link>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
                      <span>{problem.category} · {problem.totalTestsCount} tests</span>
                      {problem.tags.slice(0, 4).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-elevated)] px-1.5 py-0.5 font-code text-xs text-[var(--color-text-muted)]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-2 py-3"><DifficultyBadge difficulty={problem.difficulty} /></td>
                  <td className="px-4 py-3">
                    <div className="flex flex-nowrap justify-end gap-1.5">
                      <Button type="button" variant="outline" size="sm" onClick={() => startTimed(problem)} title="Start a 15-minute timed challenge" aria-label={`Start a timed challenge on ${problem.title}`}>
                        <AlarmClock size={14} aria-hidden="true" /><span className="hidden sm:inline">Timed</span>
                      </Button>
                      <Link href={`/app/workspace?problem=${encodeURIComponent(problem.id)}`} className={buttonVariants({ size: "sm" })}>Solve</Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
