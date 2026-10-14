"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LocalProfile } from "@/types/profile";
import { PixelAvatar } from "@/components/retro/pixel-avatar";
import { PixelBadge } from "@/components/retro/pixel-badge";
import { DotIcon, type DotIconName } from "@/components/retro/dot-icon";
import { cn } from "@/lib/utils";

import { useChallengeSession } from "@/hooks/use-challenge-session";

export interface NavItem {
  id: string;
  label: string;
  href: string;
  iconName: DotIconName;
  index: string;
}

export const NAV_ITEMS: NavItem[] = [
  { id: "overview", label: "Overview", href: "/app", iconName: "powershell", index: "01" },
  { id: "challenges", label: "Challenges", href: "/app/challenges", iconName: "list", index: "02" },
  { id: "workspace", label: "Workspace", href: "/app/workspace", iconName: "vscode", index: "03" },
  { id: "settings", label: "Settings", href: "/app/settings", iconName: "cog", index: "04" },
];

export interface AppSidebarProps {
  profile: LocalProfile | null;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onNavigate?: () => void;
  className?: string;
}

export function AppSidebar({
  profile,
  collapsed,
  onToggleCollapse,
  onNavigate,
  className,
}: AppSidebarProps) {
  const pathname = usePathname();
  const { isTimedActive, requestNavigation, formattedTime, isWarningTime, session } = useChallengeSession();

  return (
    <aside
      aria-label="Application sidebar"
      className={cn(
        "app-sidebar bg-[var(--color-surface)] border-r-2 border-[var(--color-border)] flex flex-col justify-between transition-all duration-200 select-none z-30 shrink-0 h-full",
        collapsed ? "w-16" : "w-60",
        className
      )}
    >
      {/* Top Section: User Profile Snapshot */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <div
          className={cn(
            "p-3.5 border-b-2 border-[var(--color-border)] flex items-center transition-all shrink-0",
            collapsed ? "justify-center" : "gap-3"
          )}
        >
          {profile ? (
            <PixelAvatar
              avatarId={profile.avatarId}
              size={collapsed ? 36 : 42}
              className="border-2 [box-shadow:var(--shadow-btn)] shrink-0"
            />
          ) : (
            <div className="w-9 h-9 bg-[var(--color-elevated)] border border-[var(--color-border)] animate-pulse" />
          )}

          {!collapsed && profile && (
            <div className="min-w-0 flex-1">
              <span className="block font-mono text-sm font-bold text-[var(--color-text-main)] truncate tracking-wide">
                {profile.displayName}
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <PixelBadge
                  variant="cyan"
                  bracketed={false}
                  className="text-[0.5625rem] py-0 px-1 font-mono uppercase"
                >
                  {profile.preferredLanguage}
                </PixelBadge>
                <span className="text-[0.625rem] font-mono text-[var(--color-text-muted)] uppercase truncate">
                  {profile.experienceLevel}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Timed Challenge Active Ribbon */}
        {isTimedActive && (
          <div
            className={cn(
              "px-3 py-2 bg-[var(--color-elevated)] border-b-2 border-[var(--color-accent)] font-mono shrink-0 transition-colors",
              isWarningTime ? "border-[var(--color-pink)] bg-[var(--color-pink)]/10" : ""
            )}
          >
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className={cn(
                    "w-2 h-2 rounded-full shrink-0",
                    isWarningTime
                      ? "bg-[var(--color-pink)] animate-ping"
                      : "bg-[var(--color-mint)] animate-pulse"
                  )}
                />
                {!collapsed && (
                  <span className="text-[0.625rem] font-heading font-bold text-[var(--color-accent)] uppercase tracking-wider truncate">
                    CHALLENGE
                  </span>
                )}
              </div>
              <span
                className={cn(
                  "font-mono font-bold tabular-nums text-xs",
                  isWarningTime ? "text-[var(--color-pink)] animate-pulse" : "text-[var(--color-mint)]"
                )}
              >
                {formattedTime}
              </span>
            </div>
            {!collapsed && session?.problemTitle && (
              <span className="block text-[0.625rem] text-[var(--color-text-muted)] truncate mt-0.5">
                {session.problemTitle}
              </span>
            )}
          </div>
        )}

        {/* Navigation Item List */}
        <nav className="p-2 space-y-1 flex-1 overflow-y-auto" aria-label="Main navigation">
          {!collapsed && <p className="modern-nav-group">Workspace</p>}
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/app"
                ? pathname === "/app"
                : pathname === item.href || pathname.startsWith(item.href + "/");

            return (
              <Link
                key={item.id}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                onClick={(e) => {
                  if (!requestNavigation(item.href)) {
                    e.preventDefault();
                    return;
                  }
                  onNavigate?.();
                }}
                title={collapsed ? `${item.index} ${item.label}` : undefined}
                className={cn(
                  "appearance-nav-item min-h-11 group relative flex items-center gap-3 px-3 py-2.5 font-mono text-xs transition-colors outline-none",
                  "focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--color-surface)]",
                  isActive
                    ? "bg-[var(--color-elevated)] text-[var(--color-accent)] font-bold border-l-2 border-[var(--color-accent)] shadow-[inset_3px_0_0_var(--color-accent)]"
                    : "text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-elevated)] border-l-2 border-transparent"
                )}
              >
                <div
                  className={cn(
                    "shrink-0 transition-colors",
                    isActive ? "text-[var(--color-accent)]" : "text-[var(--color-text-muted)] group-hover:text-[var(--color-text-main)]"
                  )}
                >
                  <DotIcon adaptive name={item.iconName} size={18} />
                </div>

                {!collapsed && (
                  <div className="flex items-center justify-between flex-1 min-w-0">
                    <span className="truncate">{item.label}</span>
                    <span
                      className={cn(
                        "nav-index text-[0.625rem] opacity-40 group-hover:opacity-100 transition-opacity",
                        isActive && "text-[var(--color-accent)] opacity-80"
                      )}
                    >
                      {item.index}
                    </span>
                  </div>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section: Storage Telemetry & Collapse Control */}
      <div className="p-2 border-t-2 border-[var(--color-border)] space-y-2">
        {/* Storage Locality Telemetry */}
        <div
          className={cn(
            "p-2 bg-[var(--color-canvas)] border border-[var(--color-border)] text-[0.625rem] font-mono flex items-center",
            collapsed ? "justify-center" : "justify-between"
          )}
          title="Storage: IndexedDB (exeku_local_v1) Online"
        >
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-mint)] shadow-[0_0_6px_var(--color-mint)]" />
            {!collapsed && (
              <span className="text-[var(--color-mint)] font-bold uppercase tracking-wider">
                IDB ONLINE
              </span>
            )}
          </div>
          {!collapsed && (
            <span className="text-[var(--color-text-dim)]">v2</span>
          )}
        </div>

        {/* Collapse / Expand Toggle Button */}
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "w-full py-2 px-2 text-xs font-mono text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-elevated)] border border-transparent hover:border-[var(--color-border)] flex items-center transition-colors outline-none",
            "focus-visible:ring-1 focus-visible:ring-[var(--color-accent)]",
            collapsed ? "justify-center" : "justify-between"
          )}
        >
          <span className="text-[var(--color-accent)] font-bold">
            {collapsed ? "▶" : "◀"}
          </span>
          {!collapsed && (
            <span className="text-[0.625rem] uppercase tracking-wider">
              COLLAPSE
            </span>
          )}
        </button>
      </div>
    </aside>
  );
}
