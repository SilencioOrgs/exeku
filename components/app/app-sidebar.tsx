"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LocalProfile } from "@/types/profile";
import { PixelAvatar } from "@/components/retro/pixel-avatar";
import { PixelBadge } from "@/components/retro/pixel-badge";
import { DotIcon, type DotIconName } from "@/components/retro/dot-icon";
import { cn } from "@/lib/utils";

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
  { id: "progress", label: "Progress", href: "/app/progress", iconName: "stars", index: "04" },
  { id: "settings", label: "Settings", href: "/app/settings", iconName: "cog", index: "05" },
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

  return (
    <aside
      aria-label="Application sidebar"
      className={cn(
        "bg-[#120A24] border-r-2 border-[#2E1A57] flex flex-col justify-between transition-all duration-200 select-none z-30 shrink-0",
        collapsed ? "w-16" : "w-60",
        className
      )}
    >
      {/* Top Section: User Profile Snapshot */}
      <div>
        <div
          className={cn(
            "p-3.5 border-b-2 border-[#2E1A57] flex items-center transition-all",
            collapsed ? "justify-center" : "gap-3"
          )}
        >
          {profile ? (
            <PixelAvatar
              avatarId={profile.avatarId}
              size={collapsed ? 36 : 42}
              className="border-2 shadow-[2px_2px_0px_#000000] shrink-0"
            />
          ) : (
            <div className="w-9 h-9 bg-[#1B0F36] border border-[#2E1A57] animate-pulse" />
          )}

          {!collapsed && profile && (
            <div className="min-w-0 flex-1">
              <span className="block font-mono text-sm font-bold text-white truncate tracking-wide">
                {profile.displayName}
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <PixelBadge
                  variant="cyan"
                  bracketed={false}
                  className="text-[9px] py-0 px-1 font-mono uppercase"
                >
                  {profile.preferredLanguage}
                </PixelBadge>
                <span className="text-[10px] font-mono text-[#8E80A8] uppercase truncate">
                  {profile.experienceLevel}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Item List */}
        <nav className="p-2 space-y-1" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/app"
                ? pathname === "/app"
                : pathname === item.href || pathname.startsWith(item.href + "/");

            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={onNavigate}
                title={collapsed ? `${item.index} ${item.label}` : undefined}
                className={cn(
                  "group relative flex items-center gap-3 px-3 py-2.5 font-mono text-xs transition-colors outline-none",
                  "focus-visible:ring-2 focus-visible:ring-[#00F0FF] focus-visible:ring-offset-1 focus-visible:ring-offset-[#120A24]",
                  isActive
                    ? "bg-[#1B0F36] text-[#00F0FF] font-bold border-l-2 border-[#00F0FF] shadow-[inset_3px_0_0_#00F0FF]"
                    : "text-[#A79EC4] hover:text-white hover:bg-[#180D30] border-l-2 border-transparent"
                )}
              >
                <div
                  className={cn(
                    "shrink-0 transition-colors",
                    isActive ? "text-[#00F0FF]" : "text-[#7B6E94] group-hover:text-white"
                  )}
                >
                  <DotIcon name={item.iconName} size={18} />
                </div>

                {!collapsed && (
                  <div className="flex items-center justify-between flex-1 min-w-0">
                    <span className="truncate">{item.label}</span>
                    <span
                      className={cn(
                        "text-[10px] opacity-40 group-hover:opacity-100 transition-opacity",
                        isActive && "text-[#00F0FF] opacity-80"
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
      <div className="p-2 border-t-2 border-[#2E1A57] space-y-2">
        {/* Storage Locality Telemetry */}
        <div
          className={cn(
            "p-2 bg-[#090514] border border-[#2E1A57] text-[10px] font-mono flex items-center",
            collapsed ? "justify-center" : "justify-between"
          )}
          title="Storage: IndexedDB (exeku_local_v1) Online"
        >
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00FF9D] shadow-[0_0_6px_#00FF9D]" />
            {!collapsed && (
              <span className="text-[#00FF9D] font-bold uppercase tracking-wider">
                IDB ONLINE
              </span>
            )}
          </div>
          {!collapsed && (
            <span className="text-[#6B5A8A]">v2</span>
          )}
        </div>

        {/* Collapse / Expand Toggle Button */}
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "w-full py-2 px-2 text-xs font-mono text-[#8E80A8] hover:text-white hover:bg-[#1B0F36] border border-transparent hover:border-[#2E1A57] flex items-center transition-colors outline-none",
            "focus-visible:ring-1 focus-visible:ring-[#00F0FF]",
            collapsed ? "justify-center" : "justify-between"
          )}
        >
          <span className="text-[#00F0FF] font-bold">
            {collapsed ? "▶" : "◀"}
          </span>
          {!collapsed && (
            <span className="text-[10px] uppercase tracking-wider">
              COLLAPSE
            </span>
          )}
        </button>
      </div>
    </aside>
  );
}
