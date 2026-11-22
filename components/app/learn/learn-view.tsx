"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  Code2,
  Copy,
  FileText,
  HelpCircle,
  Loader2,
  Play,
  RotateCcw,
  Sparkles,
  Terminal,
} from "lucide-react";
import { CodeEditor } from "@/components/app/code-editor";
import { DifficultyBadge, difficultyLabel } from "@/components/app/difficulty-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useProfile } from "@/hooks/use-profile";
import { checkCodeSafety } from "@/lib/execution/code-safety";
import {
  checkExerciseAnswer,
  getLearnChapter,
  LEARN_CHAPTERS,
  type LearnChapter,
  type LearnChapterId,
} from "@/lib/learn/curriculum";
import { tokenize } from "@/lib/syntax";
import { ALL_SUPPORTED_LANGUAGES, getFilenameForLanguage, LANGUAGE_DISPLAY_NAMES } from "@/lib/workspace-defaults";
import type { ExecutionResult } from "@/types/execution";
import type { ProblemDifficulty } from "@/types/problem";
import type { PreferredLanguage } from "@/types/profile";

const PROGRESS_STORAGE_KEY = "exeku:learn-completed";
const DIFFICULTY_FILTERS: Array<ProblemDifficulty | "all"> = ["all", "beginner", "intermediate", "advanced"];

function readCompleted(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PROGRESS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function writeCompleted(keys: string[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(keys));
  } catch {
    // Browser storage unavailable.
  }
}

export function HighlightedBlock({ code, language }: { code: string; language: PreferredLanguage }) {
  return (
    <pre className="code-editor font-code overflow-x-auto rounded-xl border border-[var(--color-border)] p-3.5 text-xs leading-6">
      {tokenize(code, language).map((t, i) =>
        t.type === "plain" ? t.text : <span key={i} className={`tok-${t.type}`}>{t.text}</span>,
      )}
    </pre>
  );
}

export interface LearnViewProps {
  initialChapterId?: string | null;
  initialLang?: PreferredLanguage | null;
  embedded?: boolean;
}

export function LearnView({ initialChapterId, initialLang, embedded = false }: LearnViewProps) {
  const { profile } = useProfile();
  const safeInitialLang =
    initialLang && ALL_SUPPORTED_LANGUAGES.includes(initialLang) ? initialLang : null;
  const [selectedLang, setSelectedLang] = useState<PreferredLanguage | null>(safeInitialLang);
  const lang: PreferredLanguage =
    selectedLang && ALL_SUPPORTED_LANGUAGES.includes(selectedLang)
      ? selectedLang
      : profile?.preferredLanguage && ALL_SUPPORTED_LANGUAGES.includes(profile.preferredLanguage)
        ? profile.preferredLanguage
        : "python";

  const [chapters, setChapters] = useState<LearnChapter[]>(LEARN_CHAPTERS);
  const [difficultyFilter, setDifficultyFilter] = useState<ProblemDifficulty | "all">("all");
  const [chapterId, setChapterId] = useState<LearnChapterId>(() => getLearnChapter(initialChapterId).id);
  const filteredChapters =
    difficultyFilter === "all" ? chapters : chapters.filter((c) => c.difficulty === difficultyFilter);
  const chapter =
    filteredChapters.find((c) => c.id === chapterId) ??
    filteredChapters[0] ??
    chapters.find((c) => c.id === chapterId) ??
    getLearnChapter(chapterId);
  const lesson = chapter.lessons[lang] ?? chapter.lessons.python;
  const chapterIndex = filteredChapters.findIndex((c) => c.id === chapter.id);
  const prevChapter = chapterIndex > 0 ? filteredChapters[chapterIndex - 1] : null;
  const nextChapter =
    chapterIndex >= 0 && chapterIndex < filteredChapters.length - 1
      ? filteredChapters[chapterIndex + 1]
      : null;

  // Interactive "Try it Yourself" editor state keyed to `${lang}:${chapter.id}`
  const lessonKey = `${lang}:${chapter.id}`;
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [stdinByKey, setStdinByKey] = useState<Record<string, string>>({});
  const [outputsByKey, setOutputsByKey] = useState<Record<string, { text: string; isError?: boolean; note?: string }>>({});
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState(false);

  // Interactive Exercise state
  const [answersByKey, setAnswersByKey] = useState<Record<string, string>>({});
  const [feedbackByKey, setFeedbackByKey] = useState<Record<string, "correct" | "wrong" | null>>({});
  const [showHintByKey, setShowHintByKey] = useState<Record<string, boolean>>({});
  const [completedKeys, setCompletedKeys] = useState<string[]>(() => readCompleted());

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/learn", { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { chapters?: LearnChapter[]; completedKeys?: string[] } | null) => {
        if (!data || controller.signal.aborted) return;
        if (Array.isArray(data.chapters) && data.chapters.length > 0) {
          setChapters(data.chapters);
        }
        if (Array.isArray(data.completedKeys) && data.completedKeys.length > 0) {
          setCompletedKeys((prev) => {
            const merged = Array.from(new Set([...prev, ...(data.completedKeys ?? [])]));
            writeCompleted(merged);
            return merged;
          });
        }
      })
      .catch(() => {
        /* Keep static curriculum + local progress cache. */
      });
    return () => controller.abort();
  }, []);

  const currentCode = drafts[lessonKey] ?? lesson.exampleCode;
  const currentStdin = stdinByKey[lessonKey] ?? lesson.exampleStdin ?? "";
  const currentOutput = outputsByKey[lessonKey] ?? {
    text: lesson.expectedOutput,
    note: "Expected output (press Run example to execute your code)",
  };
  const currentAnswer = answersByKey[lessonKey] ?? "";
  const currentFeedback = feedbackByKey[lessonKey] ?? null;
  const showHint = Boolean(showHintByKey[lessonKey]);
  const isChapterDone = completedKeys.includes(lessonKey);

  const markChapterCompleted = (key: string) => {
    setCompletedKeys((prev) => {
      if (prev.includes(key)) return prev;
      const next = [...prev, key];
      writeCompleted(next);
      return next;
    });
    const [targetLang, targetChapterId] = key.split(":");
    if (targetLang && targetChapterId) {
      fetch("/api/learn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapterId: targetChapterId, language: targetLang }),
      }).catch(() => {
        /* Saved locally; will sync on next completion. */
      });
    }
  };

  const handleRunExample = async () => {
    if (running) return;
    const safety = checkCodeSafety(lang, currentCode);
    if (!safety.safe) {
      setOutputsByKey((prev) => ({
        ...prev,
        [lessonKey]: {
          text: safety.message,
          isError: true,
          note: "Blocked unsafe code",
        },
      }));
      return;
    }
    setRunning(true);
    try {
      const res = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: lang,
          sourceCode: currentCode,
          stdin: currentStdin,
          timeLimitMs: 3000,
        }),
      });
      const data = (await res.json().catch(() => null)) as (ExecutionResult & { error?: string }) | null;

      if (!res.ok && res.status === 400 && data?.error) {
        setOutputsByKey((prev) => ({
          ...prev,
          [lessonKey]: {
            text: data.error!,
            isError: true,
            note: "Blocked by validation",
          },
        }));
        return;
      }

      if (res.ok && data && data.status === "SUCCESS") {
        setOutputsByKey((prev) => ({
          ...prev,
          [lessonKey]: {
            text: data.stdout || "(Program finished with no output)",
            note: `Executed in ${data.durationMs}ms`,
          },
        }));
        return;
      }

      if (res.ok && data && data.status !== "SERVICE_UNAVAILABLE" && data.status !== "INTERNAL_ERROR") {
        setOutputsByKey((prev) => ({
          ...prev,
          [lessonKey]: {
            text: data.compilerOutput || data.stderr || data.stdout || `Exited with status ${data.status}`,
            isError: true,
            note: data.status.replace(/_/g, " "),
          },
        }));
        return;
      }

      const unmodified =
        currentCode.trim() === lesson.exampleCode.trim() &&
        currentStdin.trim() === (lesson.exampleStdin ?? "").trim();
      setOutputsByKey((prev) => ({
        ...prev,
        [lessonKey]: unmodified
          ? {
              text: lesson.expectedOutput,
              note: "Verified example output (start exeku-judge to execute custom edits live)",
            }
          : {
              text: "SANDBOX SERVICE UNAVAILABLE: Start the Exeku judge worker on port 4000 (see judge/README.md) to execute custom code changes.",
              isError: true,
              note: "Judge offline",
            },
      }));
    } catch {
      const unmodified =
        currentCode.trim() === lesson.exampleCode.trim() &&
        currentStdin.trim() === (lesson.exampleStdin ?? "").trim();
      setOutputsByKey((prev) => ({
        ...prev,
        [lessonKey]: unmodified
          ? {
              text: lesson.expectedOutput,
              note: "Verified example output",
            }
          : {
              text: "SANDBOX SERVICE UNAVAILABLE: Start the Exeku judge worker on port 4000 (see judge/README.md) to execute custom code changes.",
              isError: true,
              note: "Judge offline",
            },
      }));
    } finally {
      setRunning(false);
    }
  };

  const handleCopyExample = async () => {
    try {
      await navigator.clipboard.writeText(currentCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard blocked.
    }
  };

  const handleResetExample = () => {
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[lessonKey];
      return next;
    });
    setStdinByKey((prev) => {
      const next = { ...prev };
      delete next[lessonKey];
      return next;
    });
    setOutputsByKey((prev) => {
      const next = { ...prev };
      delete next[lessonKey];
      return next;
    });
  };

  const handleCheckExercise = (e: FormEvent) => {
    e.preventDefault();
    const ok = checkExerciseAnswer(lesson, currentAnswer);
    setFeedbackByKey((prev) => ({ ...prev, [lessonKey]: ok ? "correct" : "wrong" }));
    if (ok) markChapterCompleted(lessonKey);
  };

  const completedInLang = chapters.filter((c) => completedKeys.includes(`${lang}:${c.id}`)).length;
  const progressPct = Math.round((completedInLang / Math.max(1, chapters.length)) * 100);
  const templateParts = lesson.exercise.codeTemplate.split("___");

  return (
    <div className={embedded ? "space-y-6" : "mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8"}>
      {!embedded && (
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight">Learn languages &amp; syntax</h1>
            <p className="text-sm text-[var(--color-text-muted)]">
              Interactive tutorials from Easy to Hard with live Try it yourself examples for Python 3, Java, C++, and C.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/app/docs?lang=${encodeURIComponent(lang)}`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <FileText size={14} aria-hidden="true" /> Language docs
            </Link>
            <Link
              href={`/app/workspace?lesson=${encodeURIComponent(chapter.id)}&lang=${encodeURIComponent(lang)}`}
              className={buttonVariants({ size: "sm" })}
            >
              <Code2 size={14} aria-hidden="true" /> Open in workspace
            </Link>
          </div>
        </header>
      )}

      {/* Language Picker + Progress Strip */}
      <section aria-label="Language tracks" className="skeuo-panel flex flex-wrap items-center justify-between gap-4 p-4 sm:px-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs font-medium text-[var(--color-text-muted)]">Language:</span>
          {ALL_SUPPORTED_LANGUAGES.map((l) => (
            <Button
              key={l}
              type="button"
              variant="outline"
              size="sm"
              aria-pressed={lang === l}
              onClick={() => setSelectedLang(l)}
            >
              {LANGUAGE_DISPLAY_NAMES[l]}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="text-[var(--color-text-muted)]">
            {LANGUAGE_DISPLAY_NAMES[lang]} progress:
          </span>
          <span className="font-code font-semibold text-[var(--color-primary-text)]">
            {completedInLang}/{chapters.length} ({progressPct}%)
          </span>
          <div className="skeuo-well h-2 w-24 overflow-hidden rounded-full">
            <div
              className="h-full rounded-full bg-[var(--color-primary)] transition-[width] duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </section>

      {/* Main Tutorial Layout: Chapter Sidebar + Interactive Lesson */}
      <div className="grid gap-6 lg:grid-cols-[17.5rem_minmax(0,1fr)]">
        {/* Left Chapter Navigation */}
        <aside aria-label="Tutorial chapters" className="skeuo-panel h-fit space-y-2.5 p-3.5">
          <div className="flex items-center justify-between gap-2 px-2 py-1">
            <div className="flex items-center gap-2">
              <BookOpen size={15} className="text-[var(--color-primary-text)]" aria-hidden="true" />
              <h2 className="text-xs font-semibold text-[var(--color-text-main)]">
                {LANGUAGE_DISPLAY_NAMES[lang]} tutorial
              </h2>
            </div>
            <span className="font-code text-xs text-[var(--color-text-muted)]">{filteredChapters.length} lessons</span>
          </div>

          <div className="flex flex-wrap gap-1 px-1">
            {DIFFICULTY_FILTERS.map((d) => (
              <Button
                key={d}
                type="button"
                variant="outline"
                size="xs"
                aria-pressed={difficultyFilter === d}
                onClick={() => setDifficultyFilter(d)}
              >
                {d === "all" ? "All" : difficultyLabel(d)}
              </Button>
            ))}
          </div>

          <nav className="space-y-1">
            {filteredChapters.map((item) => {
              const active = item.id === chapter.id;
              const done = completedKeys.includes(`${lang}:${item.id}`);
              return (
                <Button
                  key={item.id}
                  type="button"
                  variant="ghost"
                  aria-pressed={active}
                  onClick={() => setChapterId(item.id)}
                  className={`h-auto w-full justify-between gap-2 px-2.5 py-2 text-left text-xs ${
                    active
                      ? "border border-[var(--color-primary-edge)] bg-[var(--color-elevated)] font-semibold text-[var(--color-text-main)]"
                      : "text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]"
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="font-code text-xs text-[var(--color-primary-text)]">{item.number}</span>
                    <span className="truncate">{item.shortTitle}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    <DifficultyBadge difficulty={item.difficulty} className="px-1.5 py-0 text-xs" />
                    {done && <CheckCircle2 size={13} className="shrink-0 text-[var(--color-mint)]" aria-label="Completed" />}
                  </span>
                </Button>
              );
            })}
          </nav>
        </aside>

        {/* Right Lesson Article */}
        <div className="min-w-0 space-y-6">
          {/* Lesson Concept Card */}
          <article className="skeuo-panel space-y-5 p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--color-border)] pb-4">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-code text-xs text-[var(--color-primary-text)]">
                    Chapter {chapter.number} · {LANGUAGE_DISPLAY_NAMES[lang]}
                  </span>
                  <DifficultyBadge difficulty={chapter.difficulty} />
                  <span className="rounded-md border border-[var(--color-border)] bg-[var(--color-elevated)] px-2 py-0.5 text-xs font-medium text-[var(--color-text-muted)]">
                    {chapter.category}
                  </span>
                  {chapter.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-md bg-[var(--color-canvas)] px-1.5 py-0.5 font-code text-xs text-[var(--color-text-muted)]"
                    >
                      {tag}
                    </span>
                  ))}
                  {isChapterDone && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-[var(--color-easy-bg)] px-2 py-0.5 font-code text-xs text-[var(--color-mint)]">
                      <CheckCircle2 size={12} aria-hidden="true" /> Completed
                    </span>
                  )}
                </div>
                <h2 className="text-2xl font-semibold tracking-tight">{lesson.headline}</h2>
                <p className="text-xs text-[var(--color-text-muted)]">{chapter.summary}</p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!prevChapter}
                  onClick={() => prevChapter && setChapterId(prevChapter.id)}
                >
                  <ArrowLeft size={14} aria-hidden="true" /> Prev
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!nextChapter}
                  onClick={() => nextChapter && setChapterId(nextChapter.id)}
                >
                  Next <ArrowRight size={14} aria-hidden="true" />
                </Button>
              </div>
            </div>

            <p className="text-sm leading-relaxed text-[var(--color-text-main)]">{lesson.intro}</p>

            {/* Key Syntax Takeaways */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="skeuo-recess space-y-2 rounded-xl p-4">
                <h3 className="text-xs font-semibold text-[var(--color-primary-text)]">Key syntax rules</h3>
                <ul className="space-y-1.5 text-xs text-[var(--color-text-muted)]">
                  {lesson.keyRules.map((rule, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="font-code text-[var(--color-primary-text)]">•</span>
                      <span>{rule}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-1.5">
                <span className="block text-xs font-semibold text-[var(--color-text-muted)]">
                  Quick syntax pattern ({getFilenameForLanguage(lang)})
                </span>
                <HighlightedBlock code={lesson.syntaxSnippet} language={lang} />
              </div>
            </div>
          </article>

          {/* W3Schools-style "Try it Yourself" Interactive Example */}
          <section aria-labelledby="try-it-heading" className="skeuo-panel space-y-4 p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 id="try-it-heading" className="text-base font-semibold">{lesson.exampleTitle}</h3>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Edit the code below and click <strong>Run example</strong> to test it, or open it in the full Workspace.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => void handleCopyExample()}>
                  {copied ? <Check size={13} className="text-[var(--color-mint)]" aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={handleResetExample}>
                  <RotateCcw size={13} aria-hidden="true" /> Reset
                </Button>
                <Link
                  href={`/app/workspace?lesson=${encodeURIComponent(chapter.id)}&lang=${encodeURIComponent(lang)}`}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  <Code2 size={13} aria-hidden="true" /> Try in workspace
                </Link>
              </div>
            </div>

            <div
              className="h-56 overflow-hidden rounded-xl border border-[var(--color-border)]"
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                  e.preventDefault();
                  void handleRunExample();
                }
              }}
            >
              <CodeEditor
                key={lessonKey}
                value={currentCode}
                onChange={(val) => setDrafts((prev) => ({ ...prev, [lessonKey]: val }))}
                filename={getFilenameForLanguage(lang)}
              />
            </div>

            {lesson.exampleStdin !== undefined && (
              <div className="space-y-1.5">
                <label htmlFor="learn-stdin-box" className="block text-xs font-medium text-[var(--color-text-muted)]">
                  Standard input (stdin) passed to program
                </label>
                <textarea
                  id="learn-stdin-box"
                  rows={2}
                  value={currentStdin}
                  onChange={(e) => setStdinByKey((prev) => ({ ...prev, [lessonKey]: e.target.value }))}
                  className="skeuo-well font-code w-full rounded-xl border p-2.5 text-xs text-[var(--color-text-main)]"
                />
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button type="button" disabled={running} onClick={() => void handleRunExample()}>
                {running ? (
                  <>
                    <Loader2 size={14} className="animate-spin" aria-hidden="true" /> Running example…
                  </>
                ) : (
                  <>
                    <Play size={14} aria-hidden="true" /> Run example
                  </>
                )}
              </Button>
              {currentOutput.note && (
                <span className="font-code text-xs text-[var(--color-text-muted)]">{currentOutput.note}</span>
              )}
            </div>

            {/* Output Readout */}
            <div className="skeuo-well space-y-1.5 rounded-xl border p-3.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-text-muted)]">
                <Terminal size={13} className="text-[var(--color-primary-text)]" aria-hidden="true" />
                <span>Output</span>
              </div>
              <pre
                className={`font-code overflow-x-auto whitespace-pre-wrap text-xs leading-5 ${
                  currentOutput.isError ? "text-[var(--color-pink)]" : "text-[var(--color-text-main)]"
                }`}
              >
                {currentOutput.text}
              </pre>
            </div>
          </section>

          {/* W3Schools-style "Test Yourself With Exercises" */}
          <section aria-labelledby="exercise-heading" className="skeuo-panel space-y-4 p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Sparkles size={17} className="text-[var(--color-primary-text)]" aria-hidden="true" />
                <h3 id="exercise-heading" className="text-base font-semibold">
                  Test yourself with an exercise
                </h3>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowHintByKey((prev) => ({ ...prev, [lessonKey]: !showHint }))}
              >
                <HelpCircle size={14} aria-hidden="true" /> {showHint ? "Hide hint" : "Show hint"}
              </Button>
            </div>

            <p className="text-sm text-[var(--color-text-muted)]">{lesson.exercise.prompt}</p>

            <form onSubmit={handleCheckExercise} className="space-y-4">
              <div className="skeuo-well overflow-x-auto rounded-xl border p-4 font-code text-xs leading-7 text-[var(--color-text-main)]">
                {templateParts.map((part, idx) => (
                  <span key={idx} className="whitespace-pre-wrap">
                    {part}
                    {idx < templateParts.length - 1 && (
                      <Input
                        aria-label="Exercise answer"
                        value={currentAnswer}
                        onChange={(e) => {
                          setAnswersByKey((prev) => ({ ...prev, [lessonKey]: e.target.value }));
                          setFeedbackByKey((prev) => ({ ...prev, [lessonKey]: null }));
                        }}
                        placeholder="___"
                        className="mx-1 inline-block h-7 w-28 px-2 font-code text-xs"
                      />
                    )}
                  </span>
                ))}
              </div>

              {showHint && (
                <p className="skeuo-recess rounded-xl p-3 text-xs text-[var(--color-primary-text)]">
                  Hint: {lesson.exercise.hint}
                </p>
              )}

              {currentFeedback === "correct" && (
                <div role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[var(--color-easy-bg)] px-4 py-3 text-xs text-[var(--color-mint)]">
                  <span className="flex items-center gap-2 font-medium">
                    <CheckCircle2 size={15} aria-hidden="true" /> Correct! You completed {chapter.title} in {LANGUAGE_DISPLAY_NAMES[lang]}.
                  </span>
                  {nextChapter && (
                    <Button type="button" size="sm" onClick={() => setChapterId(nextChapter.id)}>
                      Next chapter: {nextChapter.shortTitle} <ArrowRight size={13} aria-hidden="true" />
                    </Button>
                  )}
                </div>
              )}

              {currentFeedback === "wrong" && (
                <p role="alert" className="skeuo-recess rounded-xl p-3 text-xs text-[var(--color-pink)]">
                  Not quite. Check the syntax pattern above or click Show hint and try again.
                </p>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <Button type="submit">Submit answer</Button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
