"use client";

import React from "react";
import type { ExperienceLevel, PreferredLanguage } from "@/types/profile";
import { PixelBadge } from "@/components/retro/pixel-badge";
import { DotIcon, type DotIconName } from "@/components/retro/dot-icon";
import { PixelAvatar } from "@/components/retro/pixel-avatar";
import { cn } from "@/lib/utils";

export interface StepLoadoutProps {
  displayName: string;
  avatarId: string;
  experienceLevel: ExperienceLevel;
  preferredLanguage: PreferredLanguage;
  onChangeExperience: (level: ExperienceLevel) => void;
  onChangeLanguage: (lang: PreferredLanguage) => void;
}

interface LanguageOption {
  id: PreferredLanguage;
  label: string;
  iconName: DotIconName;
  tag: string;
  accent: string;
  description: string;
}

const LANGUAGES: LanguageOption[] = [
  {
    id: "python",
    label: "Python 3",
    iconName: "python",
    tag: "SCRIPTING",
    accent: "var(--color-accent)",
    description: "Readable, dynamic, and powerful. Great for algorithms and rapid experimentation.",
  },
  {
    id: "java",
    label: "Java",
    iconName: "java",
    tag: "OBJECT-ORIENTED",
    accent: "var(--color-pink)",
    description: "Robust, strictly typed, structured enterprise and academic standard.",
  },
  {
    id: "cpp",
    label: "C++",
    iconName: "cplusplus",
    tag: "SYSTEMS",
    accent: "var(--color-primary-text)",
    description: "High-performance systems programming with templates, RAII, and manual control.",
  },
  {
    id: "c",
    label: "C",
    iconName: "file",
    tag: "LOW-LEVEL",
    accent: "var(--color-mint)",
    description: "Direct memory management, pointers, and foundational computer architecture.",
  },
];

interface LevelOption {
  id: ExperienceLevel;
  label: string;
  tag: string;
  description: string;
}

const LEVELS: LevelOption[] = [
  {
    id: "beginner",
    label: "Beginner",
    tag: "LVL 01",
    description: "Fresh to coding. Building fundamentals and syntax confidence.",
  },
  {
    id: "intermediate",
    label: "Intermediate",
    tag: "LVL 02",
    description: "Comfortable with variables, loops, functions, and standard data structures.",
  },
  {
    id: "advanced",
    label: "Advanced",
    tag: "LVL 03",
    description: "Experienced with algorithms, complexity analysis, and systems memory.",
  },
];

export function StepLoadout({
  displayName,
  avatarId,
  experienceLevel,
  preferredLanguage,
  onChangeExperience,
  onChangeLanguage,
}: StepLoadoutProps) {
  const selectedLangObj = LANGUAGES.find((l) => l.id === preferredLanguage) ?? LANGUAGES[0];
  const selectedLevelObj = LEVELS.find((l) => l.id === experienceLevel) ?? LEVELS[0];

  return (
    <div className="appearance-stack space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <PixelBadge variant="mint">STEP 03</PixelBadge>
          <span className="text-xs font-mono text-[var(--color-text-muted)] uppercase tracking-wider">
            PREFERENCES
          </span>
        </div>
        <h2 className="font-heading text-2xl sm:text-3xl text-[var(--color-text-main)] tracking-wide">
          CONFIGURE YOUR LOADOUT_
        </h2>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          Select your initial language focus and starting skill bracket. You can adjust this anytime.
        </p>
      </div>

      {/* Preferred Programming Language */}
      <div className="space-y-3">
        <label className="block text-xs font-mono uppercase tracking-wider text-[var(--color-text-main)]">
          Primary Language <span className="text-[var(--color-pink)]">*</span>
        </label>
        <div
          role="radiogroup"
          aria-label="Preferred programming language"
          className="grid grid-cols-1 sm:grid-cols-2 gap-3"
        >
          {LANGUAGES.map((lang) => {
            const isSelected = lang.id === preferredLanguage;

            return (
              <div
                key={lang.id}
                role="radio"
                aria-checked={isSelected}
                tabIndex={0}
                onClick={() => onChangeLanguage(lang.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onChangeLanguage(lang.id);
                  }
                }}
                className={cn(
                  "p-3.5 border-2 cursor-pointer transition-all duration-100 outline-none select-none relative",
                  "bg-[var(--color-surface)] hover:bg-[var(--color-elevated)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]",
                  isSelected
                    ? "border-[var(--color-accent)] [box-shadow:var(--shadow-btn)]"
                    : "border-[var(--color-border)] hover:border-[var(--color-primary)] [box-shadow:var(--shadow-btn)]"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      style={{ color: lang.accent }}
                      className="p-1.5 bg-[var(--color-canvas)] border border-[var(--color-border)]"
                    >
                      <DotIcon name={lang.iconName} size={20} />
                    </div>
                    <div>
                      <span className="font-mono text-sm font-bold text-[var(--color-text-main)] block">
                        {lang.label}
                      </span>
                      <span className="text-[0.625rem] font-mono text-[var(--color-text-dim)] uppercase tracking-wider">
                        {lang.tag}
                      </span>
                    </div>
                  </div>
                  {isSelected && (
                    <span className="text-xs font-mono text-[var(--color-accent)] font-bold">
                      [●]
                    </span>
                  )}
                </div>
                <p className="text-xs text-[var(--color-text-muted)] mt-2 line-clamp-2">
                  {lang.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Experience Level */}
      <div className="space-y-3">
        <label className="block text-xs font-mono uppercase tracking-wider text-[var(--color-text-main)]">
          Experience Level <span className="text-[var(--color-pink)]">*</span>
        </label>
        <div
          role="radiogroup"
          aria-label="Experience level"
          className="grid grid-cols-1 sm:grid-cols-3 gap-3"
        >
          {LEVELS.map((lvl) => {
            const isSelected = lvl.id === experienceLevel;

            return (
              <div
                key={lvl.id}
                role="radio"
                aria-checked={isSelected}
                tabIndex={0}
                onClick={() => onChangeExperience(lvl.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onChangeExperience(lvl.id);
                  }
                }}
                className={cn(
                  "p-3.5 border-2 cursor-pointer transition-all duration-100 outline-none select-none relative",
                  "bg-[var(--color-surface)] hover:bg-[var(--color-elevated)] focus-visible:ring-2 focus-visible:ring-[var(--color-mint)]",
                  isSelected
                    ? "border-[var(--color-mint)] [box-shadow:var(--shadow-btn)]"
                    : "border-[var(--color-border)] hover:border-[var(--color-primary)] [box-shadow:var(--shadow-btn)]"
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[0.625rem] font-mono text-[var(--color-mint)] font-bold">
                    {lvl.tag}
                  </span>
                  {isSelected && (
                    <span className="text-xs font-mono text-[var(--color-mint)] font-bold">
                      [●]
                    </span>
                  )}
                </div>
                <span className="font-mono text-sm font-bold text-[var(--color-text-main)] block">
                  {lvl.label}
                </span>
                <p className="text-[0.6875rem] text-[var(--color-text-dim)] mt-1 line-clamp-2">
                  {lvl.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Loadout Review Summary Card */}
      <div className="p-4 bg-[var(--color-canvas)] border-2 border-[var(--color-border)] [box-shadow:var(--shadow-btn)]">
        <div className="flex items-center justify-between mb-3 border-b border-[var(--color-border)] pb-2">
          <span className="text-xs font-mono text-[var(--color-primary-text)] uppercase tracking-wider font-bold">
            PROFILE REVIEW SUMMARY
          </span>
          <PixelBadge variant="purple" bracketed={false} className="text-[0.625rem] py-0 px-1">
            LOCAL TARGET
          </PixelBadge>
        </div>

        <div className="flex items-center gap-4">
          <PixelAvatar avatarId={avatarId} size={48} className="border-2" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-xs font-mono flex-1">
            <div>
              <span className="text-[var(--color-text-dim)] block">CODER:</span>
              <span className="text-[var(--color-text-main)] font-bold truncate block">
                {displayName || "Unnamed"}
              </span>
            </div>
            <div>
              <span className="text-[var(--color-text-dim)] block">LANGUAGE:</span>
              <span className="text-[var(--color-accent)] font-bold">
                {selectedLangObj.label}
              </span>
            </div>
            <div>
              <span className="text-[var(--color-text-dim)] block">EXPERIENCE:</span>
              <span className="text-[var(--color-mint)] font-bold">
                {selectedLevelObj.label}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
