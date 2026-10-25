"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, Timer, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/appearance/theme-toggle";
import { ProblemSearch } from "./problem-search";
import { useChallengeSession } from "@/hooks/use-challenge-session";
import type { LocalProfile } from "@/types/profile";

export interface AppTopbarProps {
  profile: LocalProfile | null;
}

const PRIMARY_LINKS = [
  { href: "/app", label: "Overview" },
  { href: "/app/challenges", label: "Practice" },
  { href: "/app/progress", label: "Progress" },
  { href: "/app/profile", label: "Profile" },
] as const;

const ACCOUNT_LINKS = [
  { href: "/app/profile", label: "My profile" },
  { href: "/app/settings", label: "Settings" },
] as const;

export function AppTopbar({ profile }: AppTopbarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const profileMenu = useRef<HTMLDetailsElement>(null);
  const { isTimedActive, formattedTime, requestNavigation } = useChallengeSession();

  useEffect(() => { setMobileOpen(false); if (profileMenu.current) profileMenu.current.open = false; }, [pathname]);

  useEffect(() => {
    const closeOnOutside = (event: PointerEvent) => {
      if (profileMenu.current && !profileMenu.current.contains(event.target as Node)) {
        profileMenu.current.open = false;
      }
    };
    document.addEventListener("pointerdown", closeOnOutside);
    return () => document.removeEventListener("pointerdown", closeOnOutside);
  }, []);

  const handleNavigation = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    // Let the existing challenge provider show its confirmation before leaving a timed attempt.
    if (!requestNavigation(href)) event.preventDefault();
    setMobileOpen(false);
    if (profileMenu.current) profileMenu.current.open = false;
  };

  const isActive = (href: string) => href === "/app"
    ? pathname === href
    : href === "/app/challenges"
      ? pathname === href || pathname === "/app/workspace"
      : pathname === href || pathname.startsWith(href + "/");

  const navLink = (href: string, label: string, mobile = false) => (
    <Link key={href} href={href} aria-current={isActive(href) ? "page" : undefined}
      onClick={(event) => handleNavigation(event, href)}
      className={`inline-flex min-h-10 items-center rounded-[var(--radius-btn)] px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)] ${isActive(href)
        ? "bg-[var(--color-elevated)] text-[var(--color-primary-text)]"
        : "text-[var(--color-text-muted)] hover:bg-[var(--color-elevated)] hover:text-[var(--color-text-main)]"} ${mobile ? "w-full" : ""}`}>
      {label}
    </Link>
  );

  return (
    <header className="app-topbar relative z-30 flex h-16 shrink-0 items-center justify-between gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-3 sm:px-5 lg:px-8">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-2 focus:z-50 focus:rounded-md focus:bg-[var(--color-surface)] focus:px-3 focus:py-2">Skip to content</a>
      <div className="flex min-w-0 items-center gap-2 lg:gap-5">
        <Button type="button" variant="ghost" size="icon" className="shrink-0 lg:hidden"
          aria-label="Open navigation" aria-expanded={mobileOpen} onClick={() => setMobileOpen(true)}>
          <Menu size={19} aria-hidden="true" />
        </Button>
        <Link href="/app" onClick={(event) => handleNavigation(event, "/app")}
          className="inline-flex shrink-0 items-center gap-2 rounded-md font-semibold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]">
          <span aria-hidden="true" className="grid size-8 place-items-center rounded-[var(--radius-btn)] bg-[var(--color-primary)] text-sm font-bold text-[var(--color-primary-foreground)]">E</span>
          <span className="text-lg">exeku</span>
        </Link>
        <nav aria-label="Main navigation" className="hidden min-w-0 items-center gap-1 lg:flex">
          {PRIMARY_LINKS.slice(0, 2).map((link) => navLink(link.href, link.label))}
          <span aria-label="Contests coming soon" className="inline-flex items-center gap-1 rounded-md px-3 text-sm text-[var(--color-text-muted)] opacity-75" aria-disabled="true">
            Contests <span className="text-[10px]">Coming soon</span>
          </span>
          {PRIMARY_LINKS.slice(2).map((link) => navLink(link.href, link.label))}
        </nav>
      </div>
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        {isTimedActive && <span aria-label={`Challenge time remaining ${formattedTime}`} className="hidden items-center gap-1 rounded-[var(--radius-btn)] border border-[var(--color-border)] px-2 py-1 text-xs tabular-nums text-[var(--color-text-main)] sm:inline-flex"><Timer size={14} aria-hidden="true"/>{formattedTime}</span>}
        <ProblemSearch />
        <ThemeToggle />
        <details ref={profileMenu} className="relative">
          <summary aria-label="Open profile menu" className="flex min-h-9 cursor-pointer list-none items-center gap-1 rounded-[var(--radius-btn)] border border-[var(--color-border)] px-1.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)] [&::-webkit-details-marker]:hidden"
            onKeyDown={(event) => { if (event.key === "Escape" && profileMenu.current) { profileMenu.current.open = false; event.stopPropagation(); } }}>
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[var(--color-elevated)] text-xs font-semibold" aria-hidden="true">{profile?.displayName?.slice(0, 1).toLocaleUpperCase() || <UserRound size={14}/>}</span>
            <span className="hidden max-w-28 truncate text-xs font-medium xl:inline">{profile?.displayName || "Profile"}</span>
            <ChevronDown size={13} className="hidden text-[var(--color-text-muted)] sm:block" aria-hidden="true" />
          </summary>
          <div className="absolute right-0 top-full z-40 mt-2 w-52 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-1 shadow-[var(--shadow-card)]">
            <p className="truncate border-b border-[var(--color-border)] px-3 py-2 text-xs text-[var(--color-text-muted)]">{profile?.displayName || "Local profile"}</p>
            {ACCOUNT_LINKS.map((link) => <Link key={link.href} href={link.href} onClick={(event) => handleNavigation(event, link.href)}
              className="block rounded-[var(--radius-btn)] px-3 py-2.5 text-sm hover:bg-[var(--color-elevated)] focus-visible:outline-2 focus-visible:outline-[var(--color-ring)]">{link.label}</Link>)}
            <p className="px-3 py-2 text-xs text-[var(--color-text-muted)]">Stored on this device</p>
          </div>
        </details>
      </div>
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[min(19rem,85vw)] gap-2 bg-[var(--color-surface)] p-4">
          <SheetTitle className="text-base font-semibold">Exeku</SheetTitle>
          <SheetDescription className="text-xs">Navigate your coding workspace.</SheetDescription>
          <nav aria-label="Mobile navigation" className="mt-4 flex flex-col gap-1">
            {PRIMARY_LINKS.slice(0, 2).map((link) => navLink(link.href, link.label, true))}
            <span className="px-3 py-2 text-sm text-[var(--color-text-muted)]" aria-disabled="true">Contests · Coming soon</span>
            {PRIMARY_LINKS.slice(2).map((link) => navLink(link.href, link.label, true))}
            <div className="my-2 border-t border-[var(--color-border)]" />
            {navLink("/app/workspace", "Code editor", true)}
            {navLink("/app/settings", "Settings", true)}
          </nav>
        </SheetContent>
      </Sheet>
    </header>
  );
}
