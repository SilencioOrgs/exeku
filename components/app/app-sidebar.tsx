"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, Code2, LayoutDashboard, ListChecks, Settings2, UserRound, Timer } from "lucide-react";
import { cn } from "@/lib/utils";
import { useChallengeSession } from "@/hooks/use-challenge-session";
import type { LocalProfile } from "@/types/profile";

export interface NavItem { id: string; label: string; href: string; index: string; iconName: string }
export const NAV_ITEMS: NavItem[] = [
  { id: "overview", label: "Overview", href: "/app", iconName: "overview", index: "01" },
  { id: "challenges", label: "Challenges", href: "/app/challenges", iconName: "challenges", index: "02" },
  { id: "workspace", label: "Workspace", href: "/app/workspace", iconName: "workspace", index: "03" },
  { id: "profile", label: "Profile", href: "/app/profile", iconName: "profile", index: "04" },
  { id: "settings", label: "Settings", href: "/app/settings", iconName: "settings", index: "05" },
];
const ICONS = { overview: LayoutDashboard, challenges: ListChecks, workspace: Code2, profile: UserRound, settings: Settings2 };

export interface AppSidebarProps {
  profile: LocalProfile | null;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onNavigate?: () => void;
  className?: string;
}

export function AppSidebar({ profile, collapsed, onToggleCollapse, onNavigate, className }: AppSidebarProps) {
  const pathname = usePathname();
  const { isTimedActive, formattedTime, requestNavigation } = useChallengeSession();

  return <aside aria-label="Application sidebar" className={cn("app-sidebar flex h-full shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] transition-[width] duration-150", collapsed ? "w-[68px]" : "w-56", className)}>
    <div className={cn("flex min-h-16 items-center gap-3 border-b border-[var(--color-border)] px-3", collapsed && "justify-center")}>
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--color-elevated)] text-sm font-semibold text-[var(--color-text-main)]">{profile?.displayName?.slice(0, 1).toUpperCase() || "E"}</span>
      {!collapsed && <div className="min-w-0"><p className="truncate text-sm font-semibold">{profile?.displayName || "Local profile"}</p><p className="truncate text-xs capitalize text-[var(--color-text-muted)]">{profile?.experienceLevel || "Developer preview"}</p></div>}
    </div>
    {isTimedActive && <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-3 py-2 text-xs text-[var(--color-text-muted)]"><Timer size={14} />{!collapsed && <span>Challenge {formattedTime}</span>}</div>}
    <nav aria-label="Main navigation" className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
      {NAV_ITEMS.map((item) => {
        const active = item.href === "/app" ? pathname === "/app" : pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = ICONS[item.iconName as keyof typeof ICONS];
        return <Link key={item.id} href={item.href} title={collapsed ? item.label : undefined} aria-current={active ? "page" : undefined}
          onClick={(event) => { if (!requestNavigation(item.href)) event.preventDefault(); else onNavigate?.(); }}
          className={cn("appearance-nav-item flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]",active ? "bg-[var(--color-elevated)] font-medium text-[var(--color-text-main)]" : "text-[var(--color-text-muted)] hover:bg-[var(--color-elevated)] hover:text-[var(--color-text-main)]",collapsed && "justify-center px-0")}>
          <Icon size={18} aria-hidden="true" />{!collapsed && <span>{item.label}</span>}
        </Link>;
      })}
    </nav>
    <div className="border-t border-[var(--color-border)] p-2">
      <button type="button" onClick={onToggleCollapse} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} className={cn("flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-elevated)]",collapsed && "justify-center px-0")}>
        {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}{!collapsed && <span>Collapse</span>}
      </button>
    </div>
  </aside>;
}
