"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, Copy, FileCode2, RotateCcw } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { useChallengeSession } from "@/hooks/use-challenge-session";
import type { LearnChapter } from "@/lib/learn/curriculum";
import { tokenize } from "@/lib/syntax";
import { LANGUAGE_DISPLAY_NAMES } from "@/lib/workspace-defaults";
import type { VisibleProblem } from "@/types/problem";
import type { PreferredLanguage } from "@/types/profile";
import { DifficultyBadge } from "../difficulty-badge";

export interface ProblemPaneProps {
  problem: VisibleProblem | null;
  prevHref?: string | null;
  nextHref?: string | null;
  lessonChapter?: LearnChapter | null;
  activeLanguage?: PreferredLanguage;
  onLoadLessonCode?: (code: string, stdin?: string) => void;
  onLoadSavedSolution?: () => void;
  isShowingSavedSolution?: boolean;
  onUseCustomStdin: (sampleInput: string) => void;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-1.5">
      <h2 className="text-xs font-semibold text-[var(--color-text-main)]">{title}</h2>
      {children}
    </section>
  );
}

export function ProblemPane({
  problem,
  prevHref,
  nextHref,
  lessonChapter,
  activeLanguage = "python",
  onLoadLessonCode,
  onLoadSavedSolution,
  isShowingSavedSolution = false,
  onUseCustomStdin,
}: ProblemPaneProps) {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const { requestNavigation } = useChallengeSession();

  if (!problem && lessonChapter) {
    const lesson = lessonChapter.lessons[activeLanguage];
    return (
      <div className="problem-pane flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="shrink-0 space-y-1 border-b border-[var(--color-border)] p-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="font-code text-xs text-[var(--color-primary-text)]">
                Chapter {lessonChapter.number} · {LANGUAGE_DISPLAY_NAMES[activeLanguage]}
              </span>
              <h1 className="text-base font-semibold text-[var(--color-text-main)]">{lesson.headline}</h1>
            </div>
            <Link
              href={`/app/learn?chapter=${encodeURIComponent(lessonChapter.id)}&lang=${encodeURIComponent(activeLanguage)}`}
              className="shrink-0 text-xs text-[var(--color-text-muted)] underline-offset-2 hover:text-[var(--color-text-main)] hover:underline"
            >
              All tutorials
            </Link>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3 text-sm text-[var(--color-text-main)]">
          <p className="leading-relaxed">{lesson.intro}</p>

          <Section title="Key syntax rules">
            <ul className="list-disc space-y-1 pl-4 text-xs text-[var(--color-text-muted)]">
              {lesson.keyRules.map((rule, idx) => (
                <li key={idx}>{rule}</li>
              ))}
            </ul>
          </Section>

          <Section title="Quick syntax pattern">
            <pre className="code-editor font-code overflow-x-auto whitespace-pre-wrap rounded-md border border-[var(--color-border)] p-2.5 text-xs">
              {tokenize(lesson.syntaxSnippet, activeLanguage).map((t, i) =>
                t.type === "plain" ? t.text : <span key={i} className={`tok-${t.type}`}>{t.text}</span>,
              )}
            </pre>
          </Section>

          {lesson.exampleStdin && (
            <Section title="Sample standard input (stdin)">
              <div className="space-y-1.5">
                <pre className="font-code overflow-x-auto whitespace-pre-wrap rounded-md border border-[var(--color-border)] bg-[var(--color-canvas)] p-2 text-xs">
                  {lesson.exampleStdin}
                </pre>
                <Button type="button" variant="outline" size="xs" onClick={() => onUseCustomStdin(lesson.exampleStdin!)}>
                  Use as input
                </Button>
              </div>
            </Section>
          )}

          <Section title="Expected example output">
            <pre className="font-code overflow-x-auto whitespace-pre-wrap rounded-md border border-[var(--color-border)] bg-[var(--color-canvas)] p-2.5 text-xs text-[var(--color-mint)]">
              {lesson.expectedOutput}
            </pre>
          </Section>

          {onLoadLessonCode && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onLoadLessonCode(lesson.exampleCode, lesson.exampleStdin)}
              className="w-full"
            >
              <RotateCcw size={13} aria-hidden="true" /> Reload example code
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="flex h-full min-h-0 flex-col justify-between gap-3 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-sm text-[var(--color-text-muted)]">
        <div className="flex items-start gap-2.5">
          <FileCode2 size={15} aria-hidden="true" className="mt-0.5 shrink-0 text-[var(--color-primary-text)]" />
          <div className="space-y-1">
            <p className="font-medium text-[var(--color-text-main)]">Free coding sandbox</p>
            <p className="text-xs leading-relaxed">
              Write and run code in Python 3, Java, C++, or C. Open{" "}
              <Link className="text-[var(--color-primary-text)] underline underline-offset-2" href="/app/learn">
                Learn
              </Link>{" "}
              for W3Schools-style language examples (like printing an array), or pick a{" "}
              <Link className="text-[var(--color-primary-text)] underline underline-offset-2" href="/app/challenges">
                problem
              </Link>{" "}
              when you want to submit.
            </p>
          </div>
        </div>
        <Link
          href="/app/learn"
          onClick={(event) => { if (!requestNavigation("/app/learn")) event.preventDefault(); }}
          className="skeuo-well flex items-center gap-2 rounded-xl border px-3 py-2 text-xs text-[var(--color-text-main)] hover:border-[var(--color-primary)]"
        >
          <BookOpen size={14} className="text-[var(--color-primary-text)]" aria-hidden="true" />
          <span>Browse language &amp; syntax examples →</span>
        </Link>
      </div>
    );
  }

  const copy = async (input: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(input);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 1500);
    } catch { /* clipboard blocked; nothing to undo */ }
  };

  const savedSolution = problem.savedSolution;
  const hasSavedCode = Boolean(savedSolution && savedSolution.sourceCode !== null);

  return (
    <div className="problem-pane flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="shrink-0 space-y-2 border-b border-[var(--color-border)] p-3">
        <div className="flex items-start justify-between gap-2">
          <h1 className="text-base font-semibold text-[var(--color-text-main)]">{problem.title}</h1>
          <div className="flex shrink-0 items-center gap-1.5">
            <Link
              href="/app/challenges"
              onClick={(event) => { if (!requestNavigation("/app/challenges")) event.preventDefault(); }}
              className={buttonVariants({ variant: "ghost", size: "xs" })}
            >
              All problems
            </Link>
            {prevHref && (
              <Link
                href={prevHref}
                onClick={(event) => { if (!requestNavigation(prevHref)) event.preventDefault(); }}
                aria-label="Previous problem"
                title="Previous problem"
                className={buttonVariants({ variant: "outline", size: "xs" })}
              >
                <ArrowLeft size={12} aria-hidden="true" /> Prev
              </Link>
            )}
            {nextHref && (
              <Link
                href={nextHref}
                onClick={(event) => { if (!requestNavigation(nextHref)) event.preventDefault(); }}
                aria-label="Next problem"
                title="Skip to next problem"
                className={buttonVariants({ variant: "outline", size: "xs" })}
              >
                Next <ArrowRight size={12} aria-hidden="true" />
              </Link>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-muted)]">
          <DifficultyBadge difficulty={problem.difficulty} />
          {problem.solved && (
            <span className="inline-flex items-center gap-1 rounded-full border border-[color-mix(in_srgb,var(--color-mint)_35%,transparent)] bg-[color-mix(in_srgb,var(--color-mint)_14%,transparent)] px-2 py-0.5 text-xs font-medium text-[var(--color-mint)]">
              <CheckCircle2 size={12} aria-hidden="true" />
              Solved
            </span>
          )}
          <span className="font-code">{problem.timeLimitMs} ms · {Math.round(problem.memoryLimitKb / 1000)} MB</span>
        </div>
        {hasSavedCode && savedSolution && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[color-mix(in_srgb,var(--color-mint)_30%,transparent)] bg-[color-mix(in_srgb,var(--color-mint)_8%,transparent)] px-2.5 py-1.5 text-xs">
            <span className="text-[var(--color-text-main)]">
              {isShowingSavedSolution
                ? `Showing your saved ${LANGUAGE_DISPLAY_NAMES[savedSolution.language]} answer`
                : `Saved ${LANGUAGE_DISPLAY_NAMES[savedSolution.language]} answer in database`}
            </span>
            {onLoadSavedSolution && !isShowingSavedSolution && (
              <Button type="button" variant="outline" size="xs" onClick={onLoadSavedSolution}>
                <RotateCcw size={12} aria-hidden="true" /> Load saved answer
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3 text-sm text-[var(--color-text-main)]">
        <p className="leading-relaxed">{problem.description}</p>
        <Section title="Input"><p className="text-[var(--color-text-muted)]">{problem.inputSpec}</p></Section>
        <Section title="Output"><p className="text-[var(--color-text-muted)]">{problem.outputSpec}</p></Section>
        <Section title="Constraints">
          <ul className="list-disc space-y-0.5 pl-4 text-[var(--color-text-muted)]">
            {problem.constraints.map((c, idx) => <li key={idx}>{c}</li>)}
          </ul>
        </Section>

        <Section title={`Samples (${problem.sampleTestCases.length})`}>
          <div className="space-y-2">
            {problem.sampleTestCases.map((sample, idx) => (
              <div key={idx} className="space-y-2 rounded-md border border-[var(--color-border)] bg-[var(--color-canvas)] p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium">Sample {idx + 1}</span>
                  <div className="flex gap-1">
                    <Button type="button" variant="ghost" size="xs" onClick={() => copy(sample.input, idx)}>
                      {copiedIdx === idx ? <CheckCircle2 size={12} aria-hidden="true" /> : <Copy size={12} aria-hidden="true" />}
                      {copiedIdx === idx ? "Copied" : "Copy"}
                    </Button>
                    <Button type="button" variant="outline" size="xs" onClick={() => onUseCustomStdin(sample.input)}>
                      Use as input
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div>
                    <span className="mb-0.5 block text-xs text-[var(--color-text-muted)]">Input</span>
                    <pre className="font-code overflow-x-auto whitespace-pre-wrap rounded border border-[var(--color-border)] bg-[var(--color-surface)] p-1.5 text-xs">{sample.input || "(empty)"}</pre>
                  </div>
                  <div>
                    <span className="mb-0.5 block text-xs text-[var(--color-text-muted)]">Sample output</span>
                    <pre className="font-code overflow-x-auto whitespace-pre-wrap rounded border border-[var(--color-border)] bg-[var(--color-surface)] p-1.5 text-xs">{sample.output.trim() || "(empty)"}</pre>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}
