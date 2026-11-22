"use client";

import Link from "next/link";
import { Menu, ArrowUpRight } from "lucide-react";
import { usePathname } from "next/navigation";
import { BrandWordmark } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { useChallengeSession } from "@/hooks/use-challenge-session";
import type { LocalProfile } from "@/types/profile";
import type { UserRole } from "@/types/roles";
import { NotificationsBell } from "./notifications-bell";

export interface AppTopbarProps {
  profile: LocalProfile | null;
  onRoleLoaded?: (role: UserRole) => void;
  onToggleMobileMenu: () => void;
}

const ROUTE_LABELS: Record<string, string> = {
  "/app": "Overview", "/app/learn": "Learn", "/app/docs": "Language Docs", "/app/challenges": "Challenges", "/app/classes": "Classes", "/app/workspace": "Workspace",
  "/app/profile": "Profile", "/app/settings": "Settings",
  "/app/leaderboard": "Leaderboard", "/app/events": "Events", "/app/orgs": "Organizations", "/app/friends": "Friends",
};

function labelForPath(pathname: string): string {
  if (ROUTE_LABELS[pathname]) return ROUTE_LABELS[pathname];
  if (pathname.startsWith("/app/classes/")) return "Classes";
  if (pathname.startsWith("/app/orgs/")) return "Organizations";
  if (pathname.startsWith("/app/events/")) return "Events";
  if (pathname.startsWith("/app/friends/")) return "Friends";
  return "Workspace";
}

export function AppTopbar({ onRoleLoaded, onToggleMobileMenu }: AppTopbarProps) {
  const pathname = usePathname();
  const { isTimedActive, formattedTime, requestNavigation } = useChallengeSession();

  return <header className="app-topbar flex min-h-14 shrink-0 items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 sm:px-6">
    <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 rounded-md bg-[var(--color-surface)] px-3 py-2">Skip to content</a>
    <div className="flex min-w-0 items-center gap-3">
      <Button type="button" variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation" onClick={onToggleMobileMenu}><Menu size={18} aria-hidden="true" /></Button>
      <Link href="/" onClick={(event) => { if (!requestNavigation("/")) event.preventDefault(); }} className="shrink-0"><BrandWordmark height={28} /></Link>
      <span aria-hidden="true" className="text-[var(--color-text-dim)]">/</span>
      <span className="truncate text-sm text-[var(--color-text-muted)]">{labelForPath(pathname)}</span>
    </div>
    <div className="flex items-center gap-2">
      {isTimedActive && <span className="rounded-md border border-[var(--color-border)] px-2 py-1 text-xs tabular-nums">Challenge {formattedTime}</span>}
      <NotificationsBell onRoleLoaded={onRoleLoaded} />
      <Link href="/" onClick={(event) => { if (!requestNavigation("/")) event.preventDefault(); }} className="hidden items-center gap-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] sm:inline-flex">Website <ArrowUpRight size={14} aria-hidden="true" /></Link>
    </div>
  </header>;
}
