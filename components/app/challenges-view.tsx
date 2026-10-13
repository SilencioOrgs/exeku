"use client";

import React, { useState } from "react";
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
import type { PreferredLanguage } from "@/types/profile";

type DifficultyTier = "all" | "beginner" | "intermediate" | "advanced";

const LANGUAGE_ICONS: Record<PreferredLanguage, DotIconName> = {
  python: "python",
  java: "java",
  cpp: "cplusplus",
  c: "file",
};

const DIFFICULTY_LABELS: { id: DifficultyTier; label: string }[] = [
  { id: "all", label: "ALL TIERS" },
  { id: "beginner", label: "BEGINNER" },
  { id: "intermediate", label: "INTERMEDIATE" },
  { id: "advanced", label: "ADVANCED" },
];

export function ChallengesView() {
  const { profile } = useProfile();
  const [userSelectedLang, setUserSelectedLang] = useState<PreferredLanguage | null>(null);
  const [selectedTier, setSelectedTier] = useState<DifficultyTier>("all");

  const selectedLanguage = userSelectedLang ?? profile?.preferredLanguage ?? "python";

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-[#2E1A57] pb-4">
        <div>
          <h1 className="font-pixel text-2xl text-white tracking-wide">
            CHALLENGE LIBRARY & CURRICULA_
          </h1>
          <p className="text-xs text-[#A79EC4] mt-0.5">
            Offline structured problem tracks and algorithmic practice.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PixelBadge variant="purple" bracketed>
            PHASE 2C CURRICULUM ENGINE
          </PixelBadge>
        </div>
      </div>

      {/* Language Track & Difficulty Filter Bar */}
      <PixelCard variant="default" className="p-4 border-2 border-[#2E1A57] space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Language Selector Tabs */}
          <div className="space-y-1.5">
            <span className="font-mono text-[10px] text-[#7A6E9B] uppercase tracking-wider block">
              SELECT LANGUAGE TRACK:
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {ALL_SUPPORTED_LANGUAGES.map((lang) => {
                const isSelected = selectedLanguage === lang;
                const iconName = LANGUAGE_ICONS[lang];
                return (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setUserSelectedLang(lang)}
                    className={`flex items-center gap-2 px-3 py-1.5 border font-mono text-xs transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-[#1B0F36] border-[#00F0FF] text-[#00F0FF] shadow-[2px_2px_0px_#000000]"
                        : "bg-[#090514] border-[#2E1A57] text-[#A79EC4] hover:text-white hover:border-[#3D2275]"
                    }`}
                  >
                    <DotIcon
                      name={iconName}
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
              {DIFFICULTY_LABELS.map((tier) => {
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
      </PixelCard>

      {/* Instructive Empty State Card */}
      <PixelCard
        variant="elevated"
        className="border-2 border-[#2E1A57] p-6 sm:p-8 space-y-6"
      >
        <div className="flex items-center justify-between border-b border-[#2E1A57] pb-3 text-xs font-mono">
          <span className="text-[#00F0FF]">
            CATALOG STATUS :: TRACK: {LANGUAGE_DISPLAY_NAMES[selectedLanguage].toUpperCase()} :: TIER: {selectedTier.toUpperCase()}
          </span>
          <span className="text-[#7A6E9B]">[0 PACKS MOUNTED]</span>
        </div>

        {/* Retro Terminal Log Mock */}
        <div className="bg-[#090514] border border-[#2E1A57] p-4 font-mono text-xs space-y-2">
          <div className="flex items-center gap-2 text-[#00FF9D]">
            <DotIcon name="powershell" size={16} color="#00FF9D" />
            <span>exeku-curriculum --scan-packs --track {selectedLanguage}</span>
          </div>
          <div className="text-[#7A6E9B] pl-6 space-y-1">
            <p>&gt; Scanning local IndexedDB partition for signed curriculum packs...</p>
            <p>&gt; Verified local repository: 0 packages mounted.</p>
            <p className="text-[#00F0FF]">
              &gt; Standard problem tracks are scheduled for bundle injection in Phase 2C.
            </p>
          </div>
        </div>

        {/* Explanation and Feature Information */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 border border-[#00F0FF] bg-[#120A24] flex items-center justify-center shrink-0">
              <DotIcon name="box" size={22} color="#00F0FF" />
            </div>
            <div>
              <h2 className="font-pixel text-xl text-white">
                LOCAL CURRICULUM REPOSITORY OFFLINE_
              </h2>
              <p className="text-xs text-[#A79EC4]">
                Exeku bundles problem catalogs natively on-device. Zero reliance on remote servers.
              </p>
            </div>
          </div>

          <p className="text-sm text-[#A79EC4] leading-relaxed">
            All problem definitions, test vectors, and benchmark suites are designed to run
            completely offline without needing an active internet connection. The problem library
            engine will be populated in <strong>Phase 2C</strong> once the offline execution runner is
            connected.
          </p>
        </div>

        {/* Future Lab Callout */}
        <div className="p-4 bg-[#120A24] border-2 border-[#3D2275] space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-pixel text-xs text-[#00FF9D] tracking-wider">
              [OFFLINE LAB CAPABILITY &amp; TEACHER DISTRIBUTION]
            </span>
            <PixelBadge variant="mint" bracketed>
              STANDALONE
            </PixelBadge>
          </div>
          <p className="text-xs text-[#A79EC4] leading-relaxed">
            Teachers, educators, and workshop organizers will be able to distribute standalone
            curriculum packs (<code>.exeku</code> bundles) via USB thumb drive or school local network
            shares. Students can import verified courseware instantly without accounts, cloud logins,
            or telemetry.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <button
              type="button"
              disabled
              className="w-full sm:w-auto px-4 py-2 border border-[#3D2275] bg-[#090514]/60 text-[#7A6E9B] font-mono text-xs cursor-not-allowed opacity-60 flex items-center justify-center gap-2"
            >
              <DotIcon name="box" size={14} color="#7A6E9B" />
              <span>IMPORT PROBLEM PACK (.exeku) [PHASE 2C]</span>
            </button>
            <Link href="/app/workspace" className="w-full sm:w-auto">
              <PixelButton variant="primary" size="sm" className="w-full sm:w-auto">
                OPEN LOCAL SCRATCHPAD ▶
              </PixelButton>
            </Link>
          </div>
        </div>
      </PixelCard>
    </div>
  );
}
