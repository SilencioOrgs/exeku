"use client";

import Link from "next/link";
import { Menu, ArrowUpRight } from "lucide-react";
import { usePathname } from "next/navigation";
import { BrandWordmark } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { useChallengeSession } from "@/hooks/use-challenge-session";
import type { LocalProfile } from "@/types/profile";

export interface AppTopbarProps {
  profile: LocalProfile | null;
  onToggleMobileMenu: () => void;
}

const ROUTE_LABELS: Record<string, string> = {
  "/app": "Overview", "/app/challenges": "Challenges", "/app/workspace": "Workspace",
  "/app/profile": "Profile", "/app/settings": "Settings",
  "/app/leaderboard": "Leaderboard", "/app/events": "Events", "/app/orgs": "Organizations", "/app/friends": "Friends", "/app/admin": "Admin",
};

export function AppTopbar({ onToggleMobileMenu }: AppTopbarProps) {
  const pathname = usePathname();
  const { isTimedActive, formattedTime, requestNavigation } = useChallengeSession();

  return <header className="app-topbar flex min-h-14 shrink-0 items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 sm:px-6">
    <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 rounded-md bg-[var(--color-surface)] px-3 py-2">Skip to content</a>
    <div className="flex min-w-0 items-center gap-3">
      <Button type="button" variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation" onClick={onToggleMobileMenu}><Menu size={18} /></Button>
      <Link href="/" onClick={(event) => { if (!requestNavigation("/")) event.preventDefault(); }} className="shrink-0"><BrandWordmark height={28} /></Link>
      <span aria-hidden="true" className="text-[var(--color-text-dim)]">/</span>
      <span className="truncate text-sm text-[var(--color-text-muted)]">{ROUTE_LABELS[pathname] || (pathname.startsWith("/app/orgs/") ? "Organizations" : "Workspace")}</span>
    </div>
    <div className="flex items-center gap-2">
      {isTimedActive && <span className="rounded-md border border-[var(--color-border)] px-2 py-1 text-xs tabular-nums">Challenge {formattedTime}</span>}
      <Link href="/" onClick={(event) => { if (!requestNavigation("/")) event.preventDefault(); }} className="hidden items-center gap-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] sm:inline-flex">Website <ArrowUpRight size={14} /></Link>
    </div>
  </header>;
}
