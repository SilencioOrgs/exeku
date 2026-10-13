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
    accent: "#00F0FF",
    description: "Readable, dynamic, and powerful. Great for algorithms and rapid experimentation.",
  },
  {
    id: "java",
    label: "Java",
    iconName: "java",
    tag: "OBJECT-ORIENTED",
    accent: "#FF007A",
    description: "Robust, strictly typed, structured enterprise and academic standard.",
  },
  {
    id: "cpp",
    label: "C++",
    iconName: "cplusplus",
    tag: "SYSTEMS",
    accent: "#9E00FF",
    description: "High-performance systems programming with templates, RAII, and manual control.",
  },
  {
    id: "c",
    label: "C",
    iconName: "file",
    tag: "LOW-LEVEL",
    accent: "#00FF9D",
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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <PixelBadge variant="mint">STEP 03</PixelBadge>
          <span className="text-xs font-mono text-[#A79EC4] uppercase tracking-wider">
            PREFERENCES
          </span>
        </div>
        <h2 className="font-pixel text-2xl sm:text-3xl text-white tracking-wide">
          CONFIGURE YOUR LOADOUT_
        </h2>
        <p className="text-sm text-[#A79EC4] mt-1">
          Select your initial language focus and starting skill bracket. You can adjust this anytime.
        </p>
      </div>

      {/* Preferred Programming Language */}
      <div className="space-y-3">
        <label className="block text-xs font-mono uppercase tracking-wider text-[#F5F3FF]">
          Primary Language <span className="text-[#FF007A]">*</span>
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
                  "bg-[#120A24] hover:bg-[#1B0F36] focus-visible:ring-2 focus-visible:ring-[#00F0FF]",
                  isSelected
                    ? "border-[#00F0FF] shadow-[0_0_12px_rgba(0,240,255,0.2),3px_3px_0px_#000000]"
                    : "border-[#2E1A57] hover:border-[#9E00FF] shadow-[2px_2px_0px_#000000]"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      style={{ color: lang.accent }}
                      className="p-1.5 bg-[#090514] border border-[#2E1A57]"
                    >
                      <DotIcon name={lang.iconName} size={20} />
                    </div>
                    <div>
                      <span className="font-mono text-sm font-bold text-white block">
                        {lang.label}
                      </span>
                      <span className="text-[10px] font-mono text-[#84789E] uppercase tracking-wider">
                        {lang.tag}
                      </span>
                    </div>
                  </div>
                  {isSelected && (
                    <span className="text-xs font-mono text-[#00F0FF] font-bold">
                      [●]
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#9E93B5] mt-2 line-clamp-2">
                  {lang.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Experience Level */}
      <div className="space-y-3">
        <label className="block text-xs font-mono uppercase tracking-wider text-[#F5F3FF]">
          Experience Level <span className="text-[#FF007A]">*</span>
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
                  "bg-[#120A24] hover:bg-[#1B0F36] focus-visible:ring-2 focus-visible:ring-[#00FF9D]",
                  isSelected
                    ? "border-[#00FF9D] shadow-[0_0_12px_rgba(0,255,157,0.2),3px_3px_0px_#000000]"
                    : "border-[#2E1A57] hover:border-[#9E00FF] shadow-[2px_2px_0px_#000000]"
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono text-[#00FF9D] font-bold">
                    {lvl.tag}
                  </span>
                  {isSelected && (
                    <span className="text-xs font-mono text-[#00FF9D] font-bold">
                      [●]
                    </span>
                  )}
                </div>
                <span className="font-mono text-sm font-bold text-white block">
                  {lvl.label}
                </span>
                <p className="text-[11px] text-[#84789E] mt-1 line-clamp-2">
                  {lvl.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Loadout Review Summary Card */}
      <div className="p-4 bg-[#0E071D] border-2 border-[#3D2275] shadow-[3px_3px_0px_#000000]">
        <div className="flex items-center justify-between mb-3 border-b border-[#2E1A57] pb-2">
          <span className="text-xs font-mono text-[#C084FC] uppercase tracking-wider font-bold">
            PROFILE REVIEW SUMMARY
          </span>
          <PixelBadge variant="purple" bracketed={false} className="text-[10px] py-0 px-1">
            LOCAL TARGET
          </PixelBadge>
        </div>

        <div className="flex items-center gap-4">
          <PixelAvatar avatarId={avatarId} size={48} className="border-2" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-xs font-mono flex-1">
            <div>
              <span className="text-[#6B5A8A] block">CODER:</span>
              <span className="text-white font-bold truncate block">
                {displayName || "Unnamed"}
              </span>
            </div>
            <div>
              <span className="text-[#6B5A8A] block">LANGUAGE:</span>
              <span className="text-[#00F0FF] font-bold">
                {selectedLangObj.label}
              </span>
            </div>
            <div>
              <span className="text-[#6B5A8A] block">EXPERIENCE:</span>
              <span className="text-[#00FF9D] font-bold">
                {selectedLevelObj.label}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
