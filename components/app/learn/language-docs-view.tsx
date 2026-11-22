"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  Code2,
  Columns2,
  Copy,
  FileText,
  Search,
  Terminal,
} from "lucide-react";
import { HighlightedBlock } from "@/components/app/learn/learn-view";
import { Button, buttonVariants } from "@/components/ui/button";
import { useProfile } from "@/hooks/use-profile";
import {
  getLanguageDocTopic,
  LANGUAGE_DOC_TOPICS,
  LANGUAGE_OVERVIEW_META,
  type LanguageDocTopicId,
} from "@/lib/learn/docs";
import { ALL_SUPPORTED_LANGUAGES, LANGUAGE_DISPLAY_NAMES } from "@/lib/workspace-defaults";
import type { PreferredLanguage } from "@/types/profile";

export interface LanguageDocsViewProps {
  initialTopicId?: string | null;
  initialLang?: PreferredLanguage | null;
  embedded?: boolean;
}

export function LanguageDocsView({
  initialTopicId,
  initialLang,
  embedded = false,
}: LanguageDocsViewProps) {
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

  const [topicId, setTopicId] = useState<LanguageDocTopicId>(() => getLanguageDocTopic(initialTopicId).id);
  const [searchQuery, setSearchQuery] = useState("");
  const [compareAll, setCompareAll] = useState(false);
  const [copiedLang, setCopiedLang] = useState<string | null>(null);

  const filteredTopics = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return LANGUAGE_DOC_TOPICS;
    return LANGUAGE_DOC_TOPICS.filter((t) => {
      const sec = t.byLanguage[lang];
      const inMeta =
        t.title.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.summary.toLowerCase().includes(q) ||
        t.tags.some((tag) => tag.toLowerCase().includes(q));
      const inSec =
        sec.title.toLowerCase().includes(q) ||
        sec.overview.toLowerCase().includes(q) ||
        sec.codeSnippet.toLowerCase().includes(q) ||
        sec.referenceTable.some(
          (r) =>
            r.syntax.toLowerCase().includes(q) ||
            r.description.toLowerCase().includes(q) ||
            r.notes.toLowerCase().includes(q),
        );
      return inMeta || inSec;
    });
  }, [searchQuery, lang]);

  const activeTopic =
    filteredTopics.find((t) => t.id === topicId) ??
    filteredTopics[0] ??
    getLanguageDocTopic(topicId);
  const section = activeTopic.byLanguage[lang];
  const meta = LANGUAGE_OVERVIEW_META[lang];

  const topicIndex = filteredTopics.findIndex((t) => t.id === activeTopic.id);
  const prevTopic = topicIndex > 0 ? filteredTopics[topicIndex - 1] : null;
  const nextTopic =
    topicIndex >= 0 && topicIndex < filteredTopics.length - 1
      ? filteredTopics[topicIndex + 1]
      : null;

  const copySnippet = async (code: string, key: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedLang(key);
      setTimeout(() => setCopiedLang(null), 1500);
    } catch {
      // Clipboard unavailable
    }
  };

  return (
    <div className={embedded ? "space-y-6" : "mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8"}>
      {!embedded && (
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight">Language reference docs</h1>
            <p className="text-sm text-[var(--color-text-muted)]">
              Complete syntax tables, standard library methods, I/O templates, and complexity reference for Python 3, Java, C++, and C.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/app/learn?chapter=${encodeURIComponent(activeTopic.relatedChapterId)}&lang=${encodeURIComponent(lang)}`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <BookOpen size={14} aria-hidden="true" /> Interactive tutorials
            </Link>
            <Link
              href={`/app/workspace?lesson=${encodeURIComponent(activeTopic.relatedChapterId)}&lang=${encodeURIComponent(lang)}`}
              className={buttonVariants({ size: "sm" })}
            >
              <Code2 size={14} aria-hidden="true" /> Open workspace
            </Link>
          </div>
        </header>
      )}

      {/* Language Picker & Search Bar */}
      <section aria-label="Documentation controls" className="skeuo-panel space-y-4 p-4 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs font-medium text-[var(--color-text-muted)]">Language:</span>
            {ALL_SUPPORTED_LANGUAGES.map((l) => (
              <Button
                key={l}
                type="button"
                variant="outline"
                size="sm"
                aria-pressed={!compareAll && lang === l}
                onClick={() => {
                  setSelectedLang(l);
                  setCompareAll(false);
                }}
              >
                {LANGUAGE_DISPLAY_NAMES[l]}
              </Button>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-pressed={compareAll}
              onClick={() => setCompareAll((v) => !v)}
            >
              <Columns2 size={14} aria-hidden="true" /> Compare all 4 languages
            </Button>
          </div>

          <div className="relative w-full sm:w-72">
            <Search
              size={14}
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[var(--color-text-muted)]"
            />
            <input
              type="search"
              aria-label="Search language docs"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search syntax, methods, I/O, sort…"
              className="skeuo-well h-9 w-full rounded-lg border border-input pr-3 pl-9 text-xs"
            />
          </div>
        </div>

        {/* Language Toolchain Specs Strip */}
        {!compareAll && (
          <div className="skeuo-recess grid gap-3 rounded-xl p-3.5 text-xs sm:grid-cols-3">
            <div>
              <span className="block text-xs text-[var(--color-text-muted)]">Runtime / compiler</span>
              <span className="font-code font-semibold text-[var(--color-text-main)]">{meta.version}</span>
              <span className="mt-0.5 block text-xs text-[var(--color-text-muted)]">{meta.paradigm}</span>
            </div>
            <div>
              <span className="block text-xs text-[var(--color-text-muted)]">Entry filename</span>
              <span className="font-code font-semibold text-[var(--color-primary-text)]">{meta.entryFile}</span>
              <span className="mt-0.5 block text-xs text-[var(--color-text-muted)]">Main file compiled by Exeku judge</span>
            </div>
            <div>
              <span className="block text-xs text-[var(--color-text-muted)]">Sandbox command</span>
              <code className="font-code block truncate text-xs text-[var(--color-text-main)]">
                {meta.compileCommand}
              </code>
            </div>
          </div>
        )}
      </section>

      {/* Main Docs Layout: Topic Sidebar + Reference Article */}
      <div className="grid gap-6 lg:grid-cols-[17.5rem_minmax(0,1fr)]">
        {/* Left Topic Index */}
        <aside aria-label="Documentation topics" className="skeuo-panel h-fit space-y-2.5 p-3.5">
          <div className="flex items-center justify-between gap-2 px-2 py-1">
            <div className="flex items-center gap-2">
              <FileText size={15} className="text-[var(--color-primary-text)]" aria-hidden="true" />
              <h2 className="text-xs font-semibold text-[var(--color-text-main)]">Reference topics</h2>
            </div>
            <span className="font-code text-xs text-[var(--color-text-muted)]">
              {filteredTopics.length} topics
            </span>
          </div>

          {filteredTopics.length === 0 ? (
            <p className="px-2 py-4 text-xs text-[var(--color-text-muted)]">
              No documentation topics match &ldquo;{searchQuery}&rdquo;.
            </p>
          ) : (
            <nav className="space-y-1">
              {filteredTopics.map((item) => {
                const active = item.id === activeTopic.id;
                return (
                  <Button
                    key={item.id}
                    type="button"
                    variant="ghost"
                    aria-pressed={active}
                    onClick={() => setTopicId(item.id)}
                    className={`h-auto w-full justify-between gap-2 px-2.5 py-2 text-left text-xs ${
                      active
                        ? "border border-[var(--color-primary-edge)] bg-[var(--color-elevated)] font-semibold text-[var(--color-text-main)]"
                        : "text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]"
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="font-code text-xs text-[var(--color-primary-text)]">{item.order}</span>
                      <span className="truncate">{item.shortTitle}</span>
                    </span>
                    <span className="rounded bg-[var(--color-canvas)] px-1.5 py-0.5 text-xs text-[var(--color-text-muted)]">
                      {item.category}
                    </span>
                  </Button>
                );
              })}
            </nav>
          )}
        </aside>

        {/* Right Reference Body */}
        <div className="min-w-0 space-y-6">
          {compareAll ? (
            <article className="skeuo-panel space-y-5 p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--color-border)] pb-4">
                <div className="space-y-1">
                  <span className="font-code text-xs text-[var(--color-primary-text)]">
                    Section {activeTopic.order} · Side-by-side comparison
                  </span>
                  <h2 className="text-2xl font-semibold tracking-tight">{activeTopic.title}</h2>
                  <p className="text-xs text-[var(--color-text-muted)]">{activeTopic.summary}</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => setCompareAll(false)}>
                  Single language view
                </Button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {ALL_SUPPORTED_LANGUAGES.map((l) => {
                  const langSec = activeTopic.byLanguage[l];
                  const copyKey = `${activeTopic.id}:${l}`;
                  return (
                    <div key={l} className="skeuo-recess flex flex-col justify-between space-y-3 rounded-xl p-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-sm text-[var(--color-text-main)]">
                            {LANGUAGE_DISPLAY_NAMES[l]}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="xs"
                            onClick={() => void copySnippet(langSec.codeSnippet, copyKey)}
                          >
                            {copiedLang === copyKey ? (
                              <Check size={12} className="text-[var(--color-mint)]" aria-hidden="true" />
                            ) : (
                              <Copy size={12} aria-hidden="true" />
                            )}
                            {copiedLang === copyKey ? "Copied" : "Copy"}
                          </Button>
                        </div>
                        <p className="text-xs leading-relaxed text-[var(--color-text-muted)]">
                          {langSec.overview}
                        </p>
                      </div>
                      <HighlightedBlock code={langSec.codeSnippet} language={l} />
                    </div>
                  );
                })}
              </div>
            </article>
          ) : (
            <article className="skeuo-panel space-y-6 p-5 sm:p-6">
              {/* Topic Header */}
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--color-border)] pb-4">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-code text-xs text-[var(--color-primary-text)]">
                      Docs {activeTopic.order} · {LANGUAGE_DISPLAY_NAMES[lang]}
                    </span>
                    <span className="rounded-md border border-[var(--color-border)] bg-[var(--color-elevated)] px-2 py-0.5 text-xs font-medium text-[var(--color-text-muted)]">
                      {activeTopic.category}
                    </span>
                    {activeTopic.tags.slice(0, 4).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-md bg-[var(--color-canvas)] px-1.5 py-0.5 font-code text-xs text-[var(--color-text-muted)]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <h2 className="text-2xl font-semibold tracking-tight">{section.title}</h2>
                  <p className="text-xs text-[var(--color-text-muted)]">{activeTopic.summary}</p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!prevTopic}
                    onClick={() => prevTopic && setTopicId(prevTopic.id)}
                  >
                    <ArrowLeft size={14} aria-hidden="true" /> Prev
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!nextTopic}
                    onClick={() => nextTopic && setTopicId(nextTopic.id)}
                  >
                    Next <ArrowRight size={14} aria-hidden="true" />
                  </Button>
                </div>
              </div>

              {/* Overview Prose */}
              <p className="text-sm leading-relaxed text-[var(--color-text-main)]">{section.overview}</p>

              {/* Syntax & Method Reference Table */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-[var(--color-primary-text)]">
                  Syntax &amp; standard library reference
                </h3>
                <div className="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-canvas)]">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-[var(--color-border)] bg-[var(--color-elevated)] text-[var(--color-text-muted)]">
                      <tr>
                        <th scope="col" className="px-3.5 py-2.5 font-semibold">Syntax / method</th>
                        <th scope="col" className="px-3.5 py-2.5 font-semibold">What it does</th>
                        <th scope="col" className="px-3.5 py-2.5 font-semibold">Notes &amp; complexity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {section.referenceTable.map((row, idx) => (
                        <tr
                          key={idx}
                          className="border-b border-[var(--color-border-subtle)] last:border-0 even:bg-[var(--color-surface)]/40"
                        >
                          <td className="font-code px-3.5 py-2.5 font-medium text-[var(--color-primary-text)]">
                            {row.syntax}
                          </td>
                          <td className="px-3.5 py-2.5 text-[var(--color-text-main)]">{row.description}</td>
                          <td className="font-code px-3.5 py-2.5 text-[var(--color-text-muted)]">{row.notes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Canonical Code Example */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text-main)]">
                    <Terminal size={13} className="text-[var(--color-primary-text)]" aria-hidden="true" />
                    Reference template ({LANGUAGE_OVERVIEW_META[lang].entryFile})
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      onClick={() => void copySnippet(section.codeSnippet, `${activeTopic.id}:${lang}`)}
                    >
                      {copiedLang === `${activeTopic.id}:${lang}` ? (
                        <Check size={12} className="text-[var(--color-mint)]" aria-hidden="true" />
                      ) : (
                        <Copy size={12} aria-hidden="true" />
                      )}
                      {copiedLang === `${activeTopic.id}:${lang}` ? "Copied" : "Copy snippet"}
                    </Button>
                    <Link
                      href={`/app/learn?chapter=${encodeURIComponent(activeTopic.relatedChapterId)}&lang=${encodeURIComponent(lang)}`}
                      className={buttonVariants({ variant: "outline", size: "xs" })}
                    >
                      <BookOpen size={12} aria-hidden="true" /> Practice in tutorial
                    </Link>
                    <Link
                      href={`/app/workspace?lesson=${encodeURIComponent(activeTopic.relatedChapterId)}&lang=${encodeURIComponent(lang)}`}
                      className={buttonVariants({ size: "xs" })}
                    >
                      <Code2 size={12} aria-hidden="true" /> Open in workspace
                    </Link>
                  </div>
                </div>
                <HighlightedBlock code={section.codeSnippet} language={lang} />
              </div>

              {/* Common Pitfalls & Judge Tips */}
              <div className="skeuo-recess space-y-2 rounded-xl p-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-[var(--color-primary-text)]">
                  <AlertTriangle size={14} aria-hidden="true" />
                  <span>Common pitfalls &amp; contest notes</span>
                </div>
                <ul className="space-y-1.5 text-xs text-[var(--color-text-muted)]">
                  {section.pitfalls.map((pitfall, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="font-code text-[var(--color-primary-text)]">•</span>
                      <span>{pitfall}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          )}
        </div>
      </div>
    </div>
  );
}
