"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LocalProfile } from "@/types/profile";
import { PixelBadge } from "@/components/retro/pixel-badge";
import { PixelButton } from "@/components/retro/pixel-button";
import { Menu, ArrowUpRight } from "lucide-react";

export interface AppTopbarProps {
  profile: LocalProfile | null;
  onToggleMobileMenu: () => void;
}

const ROUTE_LABELS: Record<string, string> = {
  "/app": "OVERVIEW",
  "/app/challenges": "CHALLENGES",
  "/app/workspace": "WORKSPACE",
  "/app/progress": "PROGRESS",
  "/app/settings": "SETTINGS",
};

export function AppTopbar({ profile, onToggleMobileMenu }: AppTopbarProps) {
  const pathname = usePathname();
  const currentView = ROUTE_LABELS[pathname] || "DASHBOARD";

  const langLabel = profile?.preferredLanguage?.toUpperCase() || "PYTHON 3";
  const levelTier =
    profile?.experienceLevel === "beginner"
      ? "LVL 01"
      : profile?.experienceLevel === "intermediate"
      ? "LVL 02"
      : "LVL 03";

  return (
    <header className="h-[52px] bg-[#090514] border-b-2 border-[#2E1A57] px-4 flex items-center justify-between z-20 shrink-0 select-none">
      {/* Skip to Main Content Link for A11y */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-3 focus:py-1 focus:bg-[#00F0FF] focus:text-[#090514] focus:font-mono focus:text-xs focus:font-bold"
      >
        SKIP TO CONTENT
      </a>

      {/* Left: Mobile Drawer Trigger + Brand Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleMobileMenu}
          aria-label="Toggle navigation menu"
          className="md:hidden p-1.5 text-[#A79EC4] hover:text-white bg-[#1B0F36] border border-[#2E1A57] outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]"
        >
          <Menu className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 font-mono text-xs">
          <Link
            href="/"
            title="Return to Landing Page"
            className="flex items-center gap-1.5 text-white hover:text-[#00F0FF] transition-colors outline-none focus-visible:ring-1 focus-visible:ring-[#00F0FF]"
          >
            <div className="w-5 h-5 bg-[#9E00FF] border border-[#00F0FF] flex items-center justify-center font-pixel text-[10px] font-bold shadow-[1px_1px_0px_#000000]">
              E
            </div>
            <span className="font-pixel text-sm tracking-wider text-white">
              EXE<span className="text-[#00F0FF]">KU</span>
            </span>
          </Link>

          <span className="text-[#4E3970]">▶</span>

          <span className="text-[#00F0FF] font-bold tracking-wider">
            {currentView}
          </span>
        </div>
      </div>

      {/* Right: Machine Telemetry & External Jump */}
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="hidden sm:flex items-center gap-2">
          <PixelBadge variant="cyan" bracketed={false} className="text-[10px] py-0 px-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00F0FF] animate-pulse inline-block mr-1" />
            ONLINE PREVIEW
          </PixelBadge>

          <PixelBadge variant="cyan" bracketed className="text-[10px] py-0 px-1 font-mono">
            {langLabel}
          </PixelBadge>

          <PixelBadge variant="purple" bracketed={false} className="text-[10px] py-0 px-1.5 font-mono">
            {levelTier}
          </PixelBadge>
        </div>

        <Link href="/" title="View Marketing Landing Page">
          <PixelButton variant="ghost" size="sm" className="text-xs px-2.5 py-1">
            <span className="hidden sm:inline">LANDING</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-[#00F0FF]" />
          </PixelButton>
        </Link>
      </div>
    </header>
  );
}
