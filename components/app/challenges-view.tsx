"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlarmClock, ChevronDown, Search } from "lucide-react";
import { useChallengeSession } from "@/hooks/use-challenge-session";
import { Button, buttonVariants } from "@/components/ui/button";
import { inTopic, SORT_OPTIONS, sortProblems, type SortId, type TopicId } from "@/lib/problems/topics";
import { ALL_SUPPORTED_LANGUAGES, LANGUAGE_DISPLAY_NAMES } from "@/lib/workspace-defaults";
import type { PreferredLanguage } from "@/types/profile";
import type { ProblemDifficulty, ProblemSummary } from "@/types/problem";
import { DifficultyBadge, difficultyLabel } from "./difficulty-badge";
import { TopicFilter } from "./topic-filter";

const DIFFICULTIES: ProblemDifficulty[] = ["beginner", "intermediate", "advanced"];

function FilterSelect({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode }) {
  return (
    <div className="relative">
      <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}
        className="skeuo-well h-9 w-full appearance-none rounded-lg border border-input pr-8 pl-3 text-sm">
        {children}
      </select>
      <ChevronDown size={14} aria-hidden="true" className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-[var(--color-text-muted)]" />
    </div>
  );
}

export function ChallengesView() {
  const router = useRouter();
  const challenge = useChallengeSession();
  const [language, setLanguage] = useState<PreferredLanguage | "all">("all");
  const [difficulty, setDifficulty] = useState<ProblemDifficulty | "all">("all");
  const [topic, setTopic] = useState<TopicId>("all");
  const [sort, setSort] = useState<SortId>("default");
  const [searchQuery, setSearchQuery] = useState("");
  const [problems, setProblems] = useState<ProblemSummary[] | null>(null);

  const startTimed = (problem: ProblemSummary) => {
    challenge.startChallenge(problem.id, problem.title);
    router.push(`/app/workspace?problem=${encodeURIComponent(problem.id)}`);
  };

  // Always load public, redacted metadata through the API. Never ship server test cases.
  useEffect(() => {
    let active = true;
    const query = new URLSearchParams();
    if (difficulty !== "all") query.set("difficulty", difficulty);
    if (language !== "all") query.set("language", language);
    if (searchQuery.trim()) query.set("search", searchQuery.trim());
    fetch(`/api/problems?${query.toString()}`)
      .then((response) => {
        if (!response.ok) throw new Error("Unable to load problems");
        return response.json();
      })
      .then((data: { problems?: ProblemSummary[] }) => { if (active) setProblems(data.problems ?? []); })
      .catch(() => { if (active) setProblems([]); });
    return () => { active = false; };
  }, [difficulty, language, searchQuery]);

  const visible = useMemo(() => sortProblems((problems ?? []).filter((p) => inTopic(p, topic)), sort), [problems, topic, sort]);

  return (
    <div className="challenges-view space-y-5">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Problems</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">Pick a problem, write your solution, and submit it for judging.</p>
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

      <TopicFilter problems={problems ?? []} selected={topic} onSelect={setTopic} />

      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-[1fr_auto_auto_auto]">
        <div className="relative sm:col-span-3 lg:col-span-1">
          <Search size={15} aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input type="search" aria-label="Search problems" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search problems" className="skeuo-well h-9 w-full rounded-lg border border-input pr-3 pl-9 text-sm" />
        </div>
        <FilterSelect label="Difficulty" value={difficulty} onChange={(v) => setDifficulty(v as ProblemDifficulty | "all")}>
          <option value="all">All difficulties</option>
          {DIFFICULTIES.map((d) => <option key={d} value={d}>{difficultyLabel(d)}</option>)}
        </FilterSelect>
        <FilterSelect label="Language" value={language} onChange={(v) => setLanguage(v as PreferredLanguage | "all")}>
          <option value="all">All languages</option>
          {ALL_SUPPORTED_LANGUAGES.map((lang) => <option key={lang} value={lang}>{LANGUAGE_DISPLAY_NAMES[lang]}</option>)}
        </FilterSelect>
        <FilterSelect label="Sort problems" value={sort} onChange={(v) => setSort(v as SortId)}>
          {SORT_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
        </FilterSelect>
      </div>

      <div className="skeuo-card overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        {problems === null ? (
          <p role="status" className="p-10 text-center text-sm text-[var(--color-text-muted)]">Loading problems…</p>
        ) : visible.length === 0 ? (
          <div className="p-10 text-center">
            <p className="font-semibold">No problems match</p>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">Try another topic, difficulty, language or search.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-[var(--color-border)] text-left text-xs text-[var(--color-text-muted)]">
              <tr>
                <th scope="col" className="w-12 px-4 py-2.5 font-medium">#</th>
                <th scope="col" className="px-2 py-2.5 font-medium">Title</th>
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
                    <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{problem.category} · {problem.totalTestsCount} tests</p>
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
