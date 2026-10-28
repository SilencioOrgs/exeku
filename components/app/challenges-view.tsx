"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Circle, CircleHelp, Clock3, Filter, Play, Search } from "lucide-react";
import { useProfile } from "@/hooks/use-profile";
import { useChallengeSession } from "@/hooks/use-challenge-session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { ProblemFilters, type ProblemFilterValues, type SubmissionHistoryState } from "./problem-filters";
import { ProblemPreviewSheet } from "./problem-preview-sheet";
import { filterProblemSummaries, paginateProblems } from "@/lib/problems/problem-list";
import { SUBMISSION_HISTORY_EVENT, getProblemStatus, submissionRepository } from "@/lib/storage/submission-repository";
import { LANGUAGE_DISPLAY_NAMES } from "@/lib/workspace-defaults";
import type { ProblemSummary } from "@/types/problem";
import type { LocalSubmissionRecord, ProblemProgressStatus } from "@/types/submission";

const PAGE_SIZE = 10;

const DEFAULT_FILTERS: ProblemFilterValues = {
  status: "all",
  difficulty: "all",
  category: "all",
  language: "all",
  tag: "all",
};

type CatalogState =
  | { status: "loading"; problems: ProblemSummary[] }
  | { status: "ready"; problems: ProblemSummary[] }
  | { status: "error"; problems: ProblemSummary[] };

interface SubmissionState {
  profileId: string;
  status: SubmissionHistoryState;
  submissions: LocalSubmissionRecord[];
}

function difficultyVariant(difficulty: ProblemSummary["difficulty"]) {
  if (difficulty === "beginner") return "success" as const;
  if (difficulty === "intermediate") return "warning" as const;
  return "destructive" as const;
}

function StatusIndicator({ status }: { status: ProblemProgressStatus | "unknown" }) {
  if (status === "solved") {
    return <span className="inline-flex items-center gap-1.5 text-xs text-[var(--color-mint)]" title="Solved" aria-label="Solved"><CheckCircle2 size={16} aria-hidden="true" /><span className="hidden xl:inline">Solved</span></span>;
  }
  if (status === "attempted") {
    return <span className="inline-flex items-center gap-1.5 text-xs text-[var(--color-warning)]" title="Attempted" aria-label="Attempted"><Clock3 size={16} aria-hidden="true" /><span className="hidden xl:inline">Attempted</span></span>;
  }
  if (status === "unsolved") {
    return <span className="inline-flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]" title="Unsolved" aria-label="Unsolved"><Circle size={16} aria-hidden="true" /><span className="hidden xl:inline">Unsolved</span></span>;
  }
  return <span className="inline-flex items-center text-[var(--color-text-muted)]" title="Submission status unavailable" aria-label="Submission status unavailable"><CircleHelp size={16} aria-hidden="true" /></span>;
}

export function ChallengesView() {
  const router = useRouter();
  const challenge = useChallengeSession();
  const { profile } = useProfile();
  const [filters, setFilters] = useState<ProblemFilterValues>(DEFAULT_FILTERS);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [previewProblem, setPreviewProblem] = useState<ProblemSummary | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [catalogState, setCatalogState] = useState<CatalogState>({ status: "loading", problems: [] });
  const [submissionState, setSubmissionState] = useState<SubmissionState>({ profileId: "", status: "loading", submissions: [] });

  const problems = catalogState.problems;
  const history = submissionState.profileId === profile?.id ? submissionState : null;
  const historyState: SubmissionHistoryState = history?.status ?? "loading";
  const submissions = history?.submissions ?? [];

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    fetch("/api/problems", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Unable to load the problem catalog.");
        return response.json() as Promise<{ problems?: ProblemSummary[] }>;
      })
      .then((data) => {
        if (!active) return;
        setCatalogState({ status: "ready", problems: Array.isArray(data.problems) ? data.problems : [] });
      })
      .catch(() => {
        if (active && !controller.signal.aborted) setCatalogState({ status: "error", problems: [] });
      });
    return () => { active = false; controller.abort(); };
  }, [reloadToken]);

  useEffect(() => {
    if (!profile?.id) return;
    let active = true;
    const loadHistory = () => {
      submissionRepository.getAllForProfile(profile.id)
        .then((records) => {
          if (active) setSubmissionState({ profileId: profile.id, status: "ready", submissions: records });
        })
        .catch(() => {
          if (active) setSubmissionState({ profileId: profile.id, status: "unavailable", submissions: [] });
        });
    };
    loadHistory();
    const handleHistoryChange = (event: Event) => {
      const changedProfileId = (event as CustomEvent<{ profileId?: string }>).detail?.profileId;
      if (changedProfileId === profile.id) loadHistory();
    };
    window.addEventListener(SUBMISSION_HISTORY_EVENT, handleHistoryChange);
    return () => {
      active = false;
      window.removeEventListener(SUBMISSION_HISTORY_EVENT, handleHistoryChange);
    };
  }, [profile?.id]);

  const statuses = useMemo(() => new Map(
    problems.map((problem) => [problem.id, getProblemStatus(problem.id, submissions)] as const),
  ), [problems, submissions]);

  const effectiveFilters = historyState === "ready" ? filters : { ...filters, status: "all" as const };
  const filteredProblems = useMemo(() => filterProblemSummaries(problems, {
    ...effectiveFilters,
    query: searchQuery,
    statuses,
  }), [problems, effectiveFilters, searchQuery, statuses]);
  const pageData = useMemo(() => paginateProblems(filteredProblems, page, PAGE_SIZE), [filteredProblems, page]);
  const categories = useMemo(() => [...new Set(problems.map((problem) => problem.category))].sort((a, b) => a.localeCompare(b)), [problems]);
  const tags = useMemo(() => [...new Set(problems.flatMap((problem) => problem.tags))].sort((a, b) => a.localeCompare(b)), [problems]);

  const statusCounts = useMemo(() => {
    const counts = { all: problems.length, solved: 0, attempted: 0, unsolved: 0 };
    if (historyState === "ready") {
      for (const problem of problems) counts[getProblemStatus(problem.id, submissions)] += 1;
    }
    return counts;
  }, [problems, submissions, historyState]);

  const updateFilter = <K extends keyof ProblemFilterValues>(key: K, value: ProblemFilterValues[K]) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setSearchQuery("");
    setPage(1);
  };

  const activeFilterCount = Number(searchQuery.trim().length > 0)
    + Number(effectiveFilters.status !== "all")
    + Number(effectiveFilters.difficulty !== "all")
    + Number(effectiveFilters.category !== "all")
    + Number(effectiveFilters.language !== "all")
    + Number(effectiveFilters.tag !== "all");

  const navigateToProblem = (problem: ProblemSummary) => {
    const href = `/app/workspace?problem=${encodeURIComponent(problem.id)}`;
    if (challenge.requestNavigation(href)) {
      setPreviewProblem(null);
      setFiltersOpen(false);
      router.push(href);
    }
  };

  const startTimedChallenge = (problem: ProblemSummary) => {
    challenge.startChallenge(problem.id, problem.title);
    router.push(`/app/workspace?problem=${encodeURIComponent(problem.id)}`);
  };

  const filterProps = {
    value: effectiveFilters,
    onChange: updateFilter,
    categories,
    tags,
    statusCounts,
    historyState,
    onClear: clearFilters,
  };

  return (
    <div className="challenges-view mx-auto w-full max-w-[1440px] space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text-main)] sm:text-3xl">Practice</h1>
          <p className="max-w-2xl text-sm leading-6 text-[var(--color-text-muted)]">Find a coding problem by topic, difficulty, or language. Open the statement to preview it, or solve it in the workspace.</p>
        </div>
        {catalogState.status === "ready" && <Badge variant="secondary" className="self-start sm:self-auto">{problems.length} {problems.length === 1 ? "problem" : "problems"}</Badge>}
      </header>

      {challenge.isTimedActive && (
        <Card className="flex flex-col justify-between gap-3 border-[var(--color-primary)]/30 bg-[var(--color-elevated)] p-4 sm:flex-row sm:items-center">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)]"><Clock3 size={17} aria-hidden="true" /></span>
            <div className="min-w-0">
              <p className="text-sm font-semibold">Timed challenge in progress</p>
              <p className="truncate text-sm text-[var(--color-text-muted)]">{challenge.session?.problemTitle} · {challenge.formattedTime} remaining</p>
            </div>
          </div>
          <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={() => {
            const href = `/app/workspace?problem=${encodeURIComponent(challenge.session?.problemId ?? "")}`;
            if (challenge.requestNavigation(href)) router.push(href);
          }}>Resume challenge</Button>
        </Card>
      )}

      <div className="grid min-w-0 gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <Card className="sticky top-5 p-4">
            <ProblemFilters {...filterProps} />
          </Card>
        </aside>

        <section aria-label="Problem results" className="min-w-0 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="relative flex min-w-0 flex-1 items-center">
              <Search size={17} aria-hidden="true" className="pointer-events-none absolute left-3 text-[var(--color-text-muted)]" />
              <input
                id="problem-search"
                type="search"
                value={searchQuery}
                onChange={(event) => { setSearchQuery(event.target.value); setPage(1); }}
                aria-label="Problem search"
                placeholder="Search problems, topics, or tags"
                className="h-10 w-full min-w-0 rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-surface)] py-2 pl-9 pr-3 text-sm text-[var(--color-text-main)] outline-none placeholder:text-[var(--color-text-muted)] focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
              />
            </label>
            <Button type="button" variant="outline" size="default" className="shrink-0 lg:hidden" onClick={() => setFiltersOpen(true)}>
              <Filter size={16} aria-hidden="true" /> Filters
              {activeFilterCount > 0 && <span className="ml-1 inline-flex min-w-5 items-center justify-center rounded-full bg-[var(--color-elevated)] px-1.5 py-0.5 text-xs tabular-nums">{activeFilterCount}</span>}
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-[var(--color-text-muted)]">
            <p aria-live="polite">{catalogState.status === "ready" ? `${filteredProblems.length} matching ${filteredProblems.length === 1 ? "problem" : "problems"}` : "Problem catalog"}</p>
            {activeFilterCount > 0 && <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={clearFilters}>Clear filters</Button>}
          </div>

          {catalogState.status === "loading" && (
            <Card role="status" className="flex min-h-48 items-center justify-center gap-3 p-8 text-sm text-[var(--color-text-muted)]">
              <span className="size-4 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-primary)]" aria-hidden="true" /> Loading problems…
            </Card>
          )}

          {catalogState.status === "error" && (
            <Card className="flex min-h-48 flex-col items-center justify-center gap-3 p-8 text-center">
              <AlertCircle size={22} className="text-[var(--color-text-muted)]" aria-hidden="true" />
              <h2 className="text-base font-semibold">Couldn’t load problems</h2>
              <p className="max-w-sm text-sm text-[var(--color-text-muted)]">The problem catalog is unavailable right now. Your local drafts are unchanged.</p>
              <Button type="button" variant="outline" onClick={() => setReloadToken((token) => token + 1)}>Try again</Button>
            </Card>
          )}

          {catalogState.status === "ready" && filteredProblems.length === 0 && (
            <Card className="flex min-h-52 flex-col items-center justify-center gap-3 p-8 text-center">
              <span className="grid size-10 place-items-center rounded-full bg-[var(--color-elevated)] text-[var(--color-text-muted)]"><Search size={18} aria-hidden="true" /></span>
              <h2 className="text-base font-semibold">{problems.length === 0 ? "No problems available yet" : "No matching problems"}</h2>
              <p className="max-w-sm text-sm leading-6 text-[var(--color-text-muted)]">{problems.length === 0 ? "The catalog has no published problems yet." : "Try a different search or clear one or more filters."}</p>
              {problems.length > 0 && <Button type="button" variant="outline" size="sm" onClick={clearFilters}>Clear filters</Button>}
            </Card>
          )}

          {catalogState.status === "ready" && filteredProblems.length > 0 && (
            <Card className="overflow-hidden p-0">
              <Table className="min-w-[590px]">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-14">Status</TableHead>
                    <TableHead>Problem</TableHead>
                    <TableHead className="hidden md:table-cell">Category</TableHead>
                    <TableHead>Difficulty</TableHead>
                    <TableHead className="hidden xl:table-cell">Languages</TableHead>
                    <TableHead className="w-32 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageData.items.map((problem) => {
                    const status: ProblemProgressStatus | "unknown" = historyState === "ready" ? getProblemStatus(problem.id, submissions) : "unknown";
                    return (
                      <TableRow key={problem.id}>
                        <TableCell className="px-3 sm:px-4">
                          <StatusIndicator status={status} />
                        </TableCell>
                        <TableCell className="min-w-44">
                          <Button type="button" variant="link" size="sm" onClick={() => setPreviewProblem(problem)} className="h-auto max-w-full justify-start whitespace-normal px-0 py-0 text-left text-sm font-semibold text-[var(--color-text-main)]">
                            {problem.title}
                          </Button>
                          <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1">
                            {problem.tags.map((tag) => <button key={tag} type="button" onClick={() => updateFilter("tag", tag)} className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)] focus-visible:outline-2 focus-visible:outline-[var(--color-ring)]">#{tag}</button>)}
                          </div>
                        </TableCell>
                        <TableCell className="hidden max-w-40 text-sm text-[var(--color-text-muted)] md:table-cell">{problem.category}</TableCell>
                        <TableCell><Badge variant={difficultyVariant(problem.difficulty)} className="capitalize">{problem.difficulty}</Badge></TableCell>
                        <TableCell className="hidden xl:table-cell">
                          <div className="flex flex-wrap gap-1">
                            {problem.supportedLanguages.map((language) => (
                              <Badge key={language} variant="outline" className={profile?.preferredLanguage === language ? "border-[var(--color-primary)]/50 text-[var(--color-primary)]" : ""}>
                                {LANGUAGE_DISPLAY_NAMES[language]}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="px-2 text-right sm:px-4">
                          <div className="flex items-center justify-end gap-1">
                            <Button type="button" variant="outline" size="icon-xs" className="sm:hidden" aria-label={`Start timed challenge for ${problem.title}`} title="Start a timed challenge" onClick={() => startTimedChallenge(problem)}><Clock3 size={13} aria-hidden="true" /></Button>
                            <Button type="button" variant="outline" size="sm" className="hidden h-8 px-2 sm:inline-flex" onClick={() => startTimedChallenge(problem)} title="Start a timed challenge"><Clock3 size={14} aria-hidden="true" /><span className="hidden md:inline">Timed</span></Button>
                            <Button type="button" size="sm" className="h-8 px-2.5" onClick={() => navigateToProblem(problem)}><Play size={14} aria-hidden="true" /> Solve</Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              <div className="flex flex-col gap-3 border-t border-[var(--color-border)] px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
                <p className="text-xs text-[var(--color-text-muted)]">
                  {pageData.total === 0 ? "No problems to show" : `Showing ${(pageData.page - 1) * PAGE_SIZE + 1}–${Math.min(pageData.page * PAGE_SIZE, pageData.total)} of ${pageData.total}`}
                </p>
                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <span className="text-xs text-[var(--color-text-muted)]">Page {pageData.page} of {Math.max(pageData.pageCount, 1)}</span>
                  <div className="flex gap-1.5">
                    <Button type="button" variant="outline" size="sm" className="h-8 px-2.5" disabled={pageData.page <= 1} onClick={() => setPage(pageData.page - 1)}>Previous</Button>
                    <Button type="button" variant="outline" size="sm" className="h-8 px-2.5" disabled={pageData.pageCount === 0 || pageData.page >= pageData.pageCount} onClick={() => setPage(pageData.page + 1)}>Next</Button>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </section>
      </div>

      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent side="left" className="w-[min(20rem,90vw)] max-w-none gap-5 overflow-y-auto border-r border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <SheetTitle className="text-base font-semibold">Problem filters</SheetTitle>
          <SheetDescription>Refine the list by status, topic, difficulty, language, or tag.</SheetDescription>
          <ProblemFilters {...filterProps} />
        </SheetContent>
      </Sheet>

      <ProblemPreviewSheet
        problem={previewProblem}
        onClose={() => setPreviewProblem(null)}
        onSolve={navigateToProblem}
      />
    </div>
  );
}
