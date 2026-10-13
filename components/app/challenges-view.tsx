"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useProfile } from "@/hooks/use-profile";
import { PixelCard } from "@/components/retro/pixel-card";
import { PixelButton } from "@/components/retro/pixel-button";
import { PixelBadge } from "@/components/retro/pixel-badge";
import { DotIcon, type DotIconName } from "@/components/retro/dot-icon";
import {
  ALL_SUPPORTED_LANGUAGES,
  LANGUAGE_DISPLAY_NAMES,
} from "@/lib/workspace-defaults";
import {
  getProblemSummaries,
  getVisibleProblem,
} from "@/lib/problems/catalog";
import type { PreferredLanguage } from "@/types/profile";
import type { ProblemDifficulty, VisibleProblem } from "@/types/problem";

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
  const { profile } = useProfile();
  const [selectedLanguage, setSelectedLanguage] = useState<PreferredLanguage | "all">("all");
  const [selectedTier, setSelectedTier] = useState<FilterTier>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [inspectProblemId, setInspectProblemId] = useState<string | null>(null);

  // Filter problems based on criteria
  const problems = useMemo(() => {
    return getProblemSummaries({
      difficulty: selectedTier === "all" ? undefined : selectedTier,
      language: selectedLanguage === "all" ? undefined : selectedLanguage,
      search: searchQuery.trim() || undefined,
    });
  }, [selectedTier, selectedLanguage, searchQuery]);

  const activeProblemDetail: VisibleProblem | null = useMemo(() => {
    if (!inspectProblemId) return null;
    return getVisibleProblem(inspectProblemId);
  }, [inspectProblemId]);

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-[#2E1A57] pb-4">
        <div>
          <h1 className="font-pixel text-2xl text-white tracking-wide">
            PROGRAMMING PROBLEMS &amp; ASSESSMENTS_
          </h1>
          <p className="text-xs text-[#A79EC4] mt-0.5">
            Algorithmic problem practice with automated multi-test sandbox evaluation.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PixelBadge variant="mint" bracketed>
            AUTOMATIC JUDGE READY
          </PixelBadge>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <PixelCard variant="default" className="p-4 border-2 border-[#2E1A57] space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Language Selector */}
          <div className="space-y-1.5">
            <span className="font-mono text-[10px] text-[#7A6E9B] uppercase tracking-wider block">
              LANGUAGE FILTER:
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedLanguage("all")}
                className={`px-3 py-1.5 border font-mono text-xs transition-colors cursor-pointer ${
                  selectedLanguage === "all"
                    ? "bg-[#1B0F36] border-[#00F0FF] text-[#00F0FF] shadow-[2px_2px_0px_#000000]"
                    : "bg-[#090514] border-[#2E1A57] text-[#A79EC4] hover:text-white"
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
                        ? "bg-[#1B0F36] border-[#00F0FF] text-[#00F0FF] shadow-[2px_2px_0px_#000000]"
                        : "bg-[#090514] border-[#2E1A57] text-[#A79EC4] hover:text-white"
                    }`}
                  >
                    <DotIcon
                      name={LANGUAGE_ICONS[lang]}
                      size={14}
                      color={isSelected ? "#00F0FF" : "#A79EC4"}
                    />
                    <span>{LANGUAGE_DISPLAY_NAMES[lang]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Difficulty Tier Filters */}
          <div className="space-y-1.5">
            <span className="font-mono text-[10px] text-[#7A6E9B] uppercase tracking-wider block">
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
                    className={`px-2.5 py-1.5 border font-mono text-[11px] transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-[#9E00FF]/20 border-[#9E00FF] text-white shadow-[2px_2px_0px_#000000]"
                        : "bg-[#090514] border-[#2E1A57] text-[#7A6E9B] hover:text-[#A79EC4]"
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
        <div className="pt-2 border-t border-[#2E1A57]/60 flex items-center gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search problems by title, category, or tag (e.g. arithmetic, hello)..."
            className="flex-1 bg-[#090514] border border-[#2E1A57] px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-[#00F0FF]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="text-xs font-mono text-[#7A6E9B] hover:text-white px-2 py-1"
            >
              Clear
            </button>
          )}
        </div>
      </PixelCard>

      {/* Problem Cards Listing */}
      <div className="space-y-3">
        {problems.length === 0 ? (
          <PixelCard variant="default" className="p-8 text-center border-2 border-[#2E1A57] space-y-2">
            <span className="font-pixel text-lg text-white">NO PROBLEMS FOUND_</span>
            <p className="text-xs text-[#7A6E9B] font-mono">
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
                className="p-4 sm:p-5 border-2 border-[#2E1A57] hover:border-[#9E00FF]/80 transition-colors bg-[#120A24] space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h2 className="font-pixel text-lg text-white">
                        {prob.title}_
                      </h2>
                      <PixelBadge variant={diffVariant} bracketed>
                        {prob.difficulty.toUpperCase()}
                      </PixelBadge>
                      <span className="font-mono text-xs text-[#7A6E9B]">
                        [{prob.category}]
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-mono text-[#A79EC4]">
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
                      STATEMENT 👁
                    </PixelButton>

                    <Link href={`/app/workspace?problem=${encodeURIComponent(prob.id)}`}>
                      <PixelButton variant="primary" size="sm" className="text-xs">
                        SOLVE ▶
                      </PixelButton>
                    </Link>
                  </div>
                </div>

                {/* Tags & Languages */}
                <div className="pt-2 border-t border-[#2E1A57]/60 flex items-center justify-between flex-wrap gap-2 text-[11px] font-mono">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[#7A6E9B]">Supported:</span>
                    {prob.supportedLanguages.map((l) => (
                      <span
                        key={l}
                        className={`px-1.5 py-0.5 border text-[10px] ${
                          profile?.preferredLanguage === l
                            ? "border-[#00F0FF] text-[#00F0FF] bg-[#00F0FF]/10 font-bold"
                            : "border-[#2E1A57] text-[#A79EC4] bg-[#090514]"
                        }`}
                      >
                        {LANGUAGE_DISPLAY_NAMES[l]}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-1 text-[#7A6E9B]">
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
            className="w-full max-w-2xl border-2 border-[#00F0FF] p-6 bg-[#120A24] shadow-[8px_8px_0px_#000000] space-y-4 max-h-[85vh] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#2E1A57] pb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <h3 className="font-pixel text-xl text-white">
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
                className="text-[#7A6E9B] hover:text-white font-mono text-sm cursor-pointer"
              >
                ✕ CLOSE
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto space-y-4 text-xs font-mono pr-2">
              <div className="space-y-1">
                <span className="text-[#00F0FF] font-pixel text-sm block">PROBLEM DESCRIPTION</span>
                <p className="text-[#D4C3DC] leading-relaxed font-sans text-sm">
                  {activeProblemDetail.description}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[#00F0FF] font-pixel text-sm block">INPUT SPECIFICATION</span>
                <p className="text-[#A79EC4] bg-[#090514] p-2.5 border border-[#2E1A57]">
                  {activeProblemDetail.inputSpec}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[#00F0FF] font-pixel text-sm block">OUTPUT SPECIFICATION</span>
                <p className="text-[#A79EC4] bg-[#090514] p-2.5 border border-[#2E1A57]">
                  {activeProblemDetail.outputSpec}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[#00F0FF] font-pixel text-sm block">CONSTRAINTS</span>
                <ul className="list-disc list-inside text-[#A79EC4] space-y-0.5">
                  {activeProblemDetail.constraints.map((c, idx) => (
                    <li key={idx}>{c}</li>
                  ))}
                  <li>Time Limit: {activeProblemDetail.timeLimitMs}ms</li>
                  <li>Memory Limit: {Math.round(activeProblemDetail.memoryLimitKb / 1000)}MB</li>
                </ul>
              </div>

              {/* Sample Test Cases */}
              <div className="space-y-2">
                <span className="text-[#00F0FF] font-pixel text-sm block">SAMPLE TEST CASES</span>
                {activeProblemDetail.sampleTestCases.map((s, idx) => (
                  <div key={idx} className="p-3 bg-[#090514] border border-[#2E1A57] space-y-1">
                    <span className="text-white font-bold block">Sample #{idx + 1}</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-[#7A6E9B] block">Input:</span>
                        <pre className="text-white bg-[#120A24] p-1.5 border border-[#2E1A57]">
                          {s.input || "(empty)"}
                        </pre>
                      </div>
                      <div>
                        <span className="text-[#7A6E9B] block">Output:</span>
                        <pre className="text-[#00FF9D] bg-[#120A24] p-1.5 border border-[#2E1A57]">
                          {s.output.trim()}
                        </pre>
                      </div>
                    </div>
                    {s.explanation && (
                      <p className="text-[10px] text-[#7A6E9B] pt-1">
                        Explanation: {s.explanation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-[#2E1A57] flex items-center justify-between shrink-0">
              <span className="text-[11px] font-mono text-[#7A6E9B]">
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

                <Link href={`/app/workspace?problem=${encodeURIComponent(activeProblemDetail.id)}`}>
                  <PixelButton variant="primary" size="sm">
                    SOLVE IN WORKSPACE ▶
                  </PixelButton>
                </Link>
              </div>
            </div>
          </PixelCard>
        </div>
      )}
    </div>
  );
}
