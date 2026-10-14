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
  "/app": "Overview",
  "/app/challenges": "Challenges",
  "/app/workspace": "Workspace",
  "/app/progress": "Progress",
  "/app/settings": "Settings",
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
    <header className="app-topbar min-h-13 py-2 bg-[var(--color-canvas)] border-b-2 border-[var(--color-border)] px-4 flex flex-wrap gap-2 items-center justify-between z-20 shrink-0 select-none">
      {/* Skip to Main Content Link for A11y */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-3 focus:py-1 focus:bg-[var(--color-accent)] focus:text-[var(--color-accent-foreground)] focus:font-mono focus:text-xs focus:font-bold"
      >
        SKIP TO CONTENT
      </a>

      {/* Left: Mobile Drawer Trigger + Brand Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleMobileMenu}
          aria-label="Toggle navigation menu"
          className="lg:hidden p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] bg-[var(--color-elevated)] border border-[var(--color-border)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
        >
          <Menu className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 font-mono text-xs">
          <Link
            href="/"
            title="Return to Landing Page"
            className="flex items-center gap-1.5 text-[var(--color-text-main)] hover:text-[var(--color-accent)] transition-colors outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-accent)]"
          >
            <div className="w-5 h-5 bg-[var(--color-primary)] text-[var(--color-primary-foreground)] border border-[var(--color-accent)] flex items-center justify-center font-heading text-[0.625rem] font-bold [box-shadow:var(--shadow-btn)]">
              E
            </div>
            <span className="font-heading text-sm tracking-wider text-[var(--color-text-main)]">
              EXE<span className="text-[var(--color-accent)]">KU</span>
            </span>
          </Link>

          <span className="text-[var(--color-text-dim)]">▶</span>

          <span className="text-[var(--color-accent)] font-bold tracking-wider">
            {currentView}
          </span>
        </div>
      </div>

      {/* Right: Machine Telemetry & External Jump */}
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="hidden sm:flex items-center gap-2">
          <PixelBadge variant="cyan" bracketed={false} className="text-[0.625rem] py-0 px-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] animate-pulse inline-block mr-1" />
            ONLINE PREVIEW
          </PixelBadge>

          <PixelBadge variant="cyan" bracketed className="text-[0.625rem] py-0 px-1 font-mono">
            {langLabel}
          </PixelBadge>

          <PixelBadge variant="purple" bracketed={false} className="text-[0.625rem] py-0 px-1.5 font-mono">
            {levelTier}
          </PixelBadge>
        </div>

        <Link href="/" title="View Marketing Landing Page">
          <PixelButton variant="ghost" size="sm" className="text-xs px-2.5 py-1">
            <span className="hidden sm:inline">LANDING</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-[var(--color-accent)]" />
          </PixelButton>
        </Link>
      </div>
    </header>
  );
}
