"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, ChevronLeft, ChevronRight, Code2, LayoutDashboard, Timer, Trophy, UserRound, Users, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DEFAULT_AVATAR_ID, PixelAvatar } from "@/components/retro/pixel-avatar";
import { useChallengeSession } from "@/hooks/use-challenge-session";
import type { LocalProfile } from "@/types/profile";

type NavLink = { label: string; href: string };
type NavGroup = { id: string; label: string; icon: LucideIcon; href?: string; items?: NavLink[] };

const NAV: NavGroup[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, href: "/app" },
  { id: "practice", label: "Practice", icon: Code2, items: [{ label: "Challenges", href: "/app/challenges" }, { label: "Classes", href: "/app/classes" }, { label: "Workspace", href: "/app/workspace" }] },
  { id: "compete", label: "Compete", icon: Trophy, items: [{ label: "Leaderboard", href: "/app/leaderboard" }, { label: "Events", href: "/app/events" }] },
  { id: "community", label: "Community", icon: Users, items: [{ label: "Friends", href: "/app/friends" }, { label: "Organizations", href: "/app/orgs" }] },
  { id: "account", label: "Account", icon: UserRound, items: [{ label: "Profile", href: "/app/profile" }, { label: "Settings", href: "/app/settings" }] },
];

const isCurrent = (pathname: string, href: string) => href === "/app" ? pathname === "/app" : pathname === href || pathname.startsWith(href + "/");

export interface AppSidebarProps {
  profile: LocalProfile | null;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onNavigate?: () => void;
  className?: string;
}

const KEY = "appearance-nav-item flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]";

export function AppSidebar({ profile, collapsed, onToggleCollapse, onNavigate, className }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { isTimedActive, formattedTime, requestNavigation } = useChallengeSession();
  const nav = NAV;
  const currentGroup = nav.find((g) => g.items?.some((i) => isCurrent(pathname, i.href)))?.id ?? null;
  // A manual toggle lasts until the page changes, then the current section opens by itself.
  const [toggled, setToggled] = useState<{ path: string; id: string | null } | null>(null);
  const openId = toggled?.path === pathname ? toggled.id : currentGroup;

  const navLink = (href: string, className: string, children: ReactNode, current: boolean, title?: string, activeGroup?: boolean) => (
    <Link href={href} title={title} aria-label={title} aria-current={current ? "page" : undefined} data-active={activeGroup || undefined} className={className}
      onClick={(event) => { if (!requestNavigation(href)) event.preventDefault(); else onNavigate?.(); }}>
      {children}
    </Link>
  );

  return <aside aria-label="Application sidebar" className={cn("app-sidebar flex h-full shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] transition-[width] duration-150", collapsed ? "w-[68px]" : "w-56", className)}>
    <div className={cn("flex min-h-16 items-center gap-3 border-b border-[var(--color-border)] px-3", collapsed && "justify-center")}>
      <PixelAvatar avatarId={profile?.avatarId ?? DEFAULT_AVATAR_ID} borderId={profile?.borderId} size={36} />
      {!collapsed && <div className="min-w-0"><p className="truncate text-sm font-semibold">{profile?.displayName || "Local profile"}</p><p className="truncate text-xs capitalize text-[var(--color-text-muted)]">{profile?.experienceLevel || "Developer preview"}</p></div>}
    </div>
    {isTimedActive && (
      <div title={collapsed ? `Challenge ${formattedTime}` : undefined} className={cn("flex items-center gap-2 border-b border-[var(--color-border)] px-3 py-2 text-xs text-[var(--color-text-muted)]", collapsed && "justify-center")}>
        <Timer size={14} aria-hidden="true" />
        <span className={collapsed ? "sr-only" : undefined}>Challenge {formattedTime}</span>
      </div>
    )}
    <nav aria-label="Main navigation" className="min-h-0 flex-1 overflow-y-auto p-2">
      {nav.map((group) => {
        const Icon = group.icon;
        const icon = <Icon size={18} aria-hidden="true" />;
        const keyClass = cn(KEY, collapsed && "justify-center px-0");
        const groupActive = group.id === currentGroup;

        if (group.href) return <div key={group.id}>{navLink(group.href, keyClass, <>{icon}{!collapsed && <span>{group.label}</span>}</>, isCurrent(pathname, group.href), collapsed ? group.label : undefined)}</div>;

        // No room for a dropdown when collapsed, so the icon goes straight to the section's first page.
        if (collapsed) {
          const firstHref = group.items![0].href;
          return <div key={group.id}>{navLink(firstHref, keyClass, icon, isCurrent(pathname, firstHref), group.label, groupActive)}</div>;
        }

        const open = openId === group.id;
        const panelId = `nav-${group.id}`;
        return <div key={group.id}>
          <Button type="button" variant="ghost" aria-expanded={open} aria-controls={panelId} data-active={groupActive || undefined}
            onClick={() => {
              // Entering a section goes to its first page, so the lit key always matches the page shown. The mobile menu stays open to pick another.
              if (groupActive) return setToggled({ path: pathname, id: open ? null : group.id });
              const first = group.items![0].href;
              if (!requestNavigation(first)) return;
              setToggled({ path: pathname, id: group.id });
              router.push(first);
            }}
            className={cn(KEY, "h-10 w-full justify-start")}>
            {icon}<span className="flex-1 text-left">{group.label}</span>
            <ChevronDown size={15} aria-hidden="true" className={cn("transition-transform duration-150 motion-reduce:transition-none", open && "rotate-180")} />
          </Button>
          {open && <ul id={panelId} className="nav-sub ml-[1.3rem] mb-1 border-l border-[var(--color-border)] py-0.5 pl-2.5">
            {group.items!.map((item) => {
              const current = isCurrent(pathname, item.href);
              return <li key={item.href}>{navLink(item.href, "nav-sub-link flex min-h-9 items-center rounded-md px-2.5 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]", item.label, current)}</li>;
            })}
          </ul>}
        </div>;
      })}
    </nav>
    <div className="border-t border-[var(--color-border)] p-2">
      <Button type="button" variant="outline" onClick={onToggleCollapse} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} className={cn("h-10 w-full justify-start gap-3 px-3 text-[var(--color-text-muted)]",collapsed && "justify-center px-0")}>
        {collapsed ? <ChevronRight size={18} aria-hidden="true" /> : <ChevronLeft size={18} aria-hidden="true" />}{!collapsed && <span>Collapse</span>}
      </Button>
    </div>
  </aside>;
}
