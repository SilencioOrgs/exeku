"use client";

import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ALL_SUPPORTED_LANGUAGES, LANGUAGE_DISPLAY_NAMES } from "@/lib/workspace-defaults";
import type { ExecutionLanguage } from "@/types/execution";
import type { ProblemDifficulty } from "@/types/problem";
import type { ProblemProgressStatus } from "@/types/submission";
import type { ProblemStatusFilter } from "@/lib/problems/problem-list";

export interface ProblemFilterValues {
  status: ProblemStatusFilter;
  difficulty: "all" | ProblemDifficulty;
  category: string;
  language: "all" | ExecutionLanguage;
  tag: string;
}

export type SubmissionHistoryState = "loading" | "ready" | "unavailable";

interface ProblemFiltersProps {
  value: ProblemFilterValues;
  onChange: <K extends keyof ProblemFilterValues>(key: K, value: ProblemFilterValues[K]) => void;
  categories: string[];
  tags: string[];
  statusCounts: Record<"all" | ProblemProgressStatus, number>;
  historyState: SubmissionHistoryState;
  onClear: () => void;
}

const STATUS_OPTIONS: { value: ProblemStatusFilter; label: string }[] = [
  { value: "all", label: "All problems" },
  { value: "solved", label: "Solved" },
  { value: "attempted", label: "Attempted" },
  { value: "unsolved", label: "Unsolved" },
];

const SELECT_CLASS = "h-9 w-full min-w-0 rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 text-sm text-[var(--color-text-main)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]";

export function ProblemFilters({
  value,
  onChange,
  categories,
  tags,
  statusCounts,
  historyState,
  onClear,
}: ProblemFiltersProps) {
  const activeCount = Number(value.status !== "all")
    + Number(value.difficulty !== "all")
    + Number(value.category !== "all")
    + Number(value.language !== "all")
    + Number(value.tag !== "all");

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-[var(--color-text-main)]">Filters</h2>
        <Button type="button" variant="ghost" size="sm" onClick={onClear} disabled={activeCount === 0} className="h-7 px-2 text-xs">
          <RotateCcw size={13} aria-hidden="true" /> Clear
        </Button>
      </div>

      <fieldset className="space-y-2">
        <legend className="mb-2 text-xs font-medium text-[var(--color-text-muted)]">Status</legend>
        <div role="group" aria-label="Status filter" className="flex flex-col gap-1">
          {STATUS_OPTIONS.map((option) => {
            const disabled = option.value !== "all" && historyState !== "ready";
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={value.status === option.value}
                disabled={disabled}
                onClick={() => onChange("status", option.value)}
                className={`flex min-h-9 items-center justify-between gap-2 rounded-[var(--radius-btn)] px-2.5 text-left text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)] disabled:cursor-not-allowed disabled:opacity-50 ${value.status === option.value ? "bg-[var(--color-elevated)] font-medium text-[var(--color-text-main)]" : "text-[var(--color-text-muted)] hover:bg-[var(--color-elevated)]"}`}
              >
                <span>{option.label}</span>
                <span className="text-xs tabular-nums text-[var(--color-text-muted)]">
                  {historyState === "ready" ? statusCounts[option.value] : option.value === "all" ? statusCounts.all : "—"}
                </span>
              </button>
            );
          })}
        </div>
        {historyState === "loading" && <p className="text-xs leading-5 text-[var(--color-text-muted)]">Loading local submission history…</p>}
        {historyState === "unavailable" && <p className="text-xs leading-5 text-[var(--color-text-muted)]">Submission status is unavailable. Other filters still work.</p>}
      </fieldset>

      <FilterSelect label="Difficulty filter" title="Difficulty" value={value.difficulty}
        onChange={(next) => onChange("difficulty", next as ProblemFilterValues["difficulty"])}
        options={[["all", "All difficulties"], ["beginner", "Beginner"], ["intermediate", "Intermediate"], ["advanced", "Advanced"]]} />

      <FilterSelect label="Category filter" title="Category" value={value.category}
        onChange={(next) => onChange("category", next)}
        options={[["all", "All categories"], ...categories.map((category) => [category, category] as [string, string])]} />

      <FilterSelect label="Language filter" title="Language" value={value.language}
        onChange={(next) => onChange("language", next as ProblemFilterValues["language"])}
        options={[["all", "All languages"], ...ALL_SUPPORTED_LANGUAGES.map((language) => [language, LANGUAGE_DISPLAY_NAMES[language]] as [string, string])]} />

      <FilterSelect label="Tag filter" title="Tag" value={value.tag}
        onChange={(next) => onChange("tag", next)}
        options={[["all", "All tags"], ...tags.map((tag) => [tag, `#${tag}`] as [string, string])]} />
    </div>
  );
}

function FilterSelect({
  label,
  title,
  value,
  onChange,
  options,
}: {
  label: string;
  title: string;
  value: string;
  onChange: (value: string) => void;
  options: [string, string][];
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={`problem-filter-${label.replace(/\s+/g, "-")}`} className="block text-xs font-medium text-[var(--color-text-muted)]">{title}</label>
      <select
        id={`problem-filter-${label.replace(/\s+/g, "-")}`}
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={SELECT_CLASS}
      >
        {options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}
      </select>
    </div>
  );
}
