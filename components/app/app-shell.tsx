"use client";

import React, { useState, useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useProfile } from "@/hooks/use-profile";
import { AppSidebar } from "./app-sidebar";
import { AppTopbar } from "./app-topbar";

export interface AppShellProps {
  children: React.ReactNode;
}

function subscribeSidebar(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getSidebarSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("exeku:sidebar-collapsed") === "true";
}

function getServerSidebarSnapshot(): boolean {
  return false;
}

export function AppShell({ children }: AppShellProps) {
  const router = useRouter();
  const { profile, isLoading } = useProfile();

  const persistedCollapsed = useSyncExternalStore(
    subscribeSidebar,
    getSidebarSnapshot,
    getServerSidebarSnapshot
  );

  const [collapsedOverride, setCollapsedOverride] = useState<boolean | null>(null);
  const collapsed = collapsedOverride ?? persistedCollapsed;
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !profile) {
      router.replace("/setup");
    }
  }, [isLoading, profile, router]);

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsedOverride(next);
    if (typeof window !== "undefined") {
      localStorage.setItem("exeku:sidebar-collapsed", String(next));
      window.dispatchEvent(new Event("storage"));
    }
  };

  if (isLoading || !profile) {
    return (
      <div className="min-h-screen bg-[#090514] flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#00F0FF] border-t-transparent animate-spin" />
          <span className="font-mono text-xs text-[#00F0FF] uppercase tracking-widest animate-pulse">
            LOADING LOCAL WORKSPACE...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090514] text-white flex flex-col overflow-hidden relative">
      {/* Background Pixel Grid Pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20 z-0"
        style={{
          backgroundImage:
            "linear-gradient(to right, #2E1A57 1px, transparent 1px), linear-gradient(to bottom, #2E1A57 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      {/* Top Application Bar */}
      <AppTopbar
        profile={profile}
        onToggleMobileMenu={() => setMobileOpen((o) => !o)}
      />

      {/* Main Workspace Frame */}
      <div className="flex-1 flex overflow-hidden relative z-10">
        {/* Desktop Collapsible Sidebar */}
        <AppSidebar
          profile={profile}
          collapsed={collapsed}
          onToggleCollapse={toggleCollapse}
          className="hidden md:flex"
        />

        {/* Mobile Slide-Out Drawer with Backdrop */}
        {mobileOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation menu"
            className="fixed inset-0 z-50 md:hidden flex"
          >
            <div
              className="fixed inset-0 bg-black/80 backdrop-blur-xs transition-opacity"
              onClick={() => setMobileOpen(false)}
            />
            <div className="relative w-64 max-w-[80vw] h-full z-10 flex">
              <AppSidebar
                profile={profile}
                collapsed={false}
                onToggleCollapse={() => setMobileOpen(false)}
                onNavigate={() => setMobileOpen(false)}
                className="w-full h-full shadow-[4px_0_16px_rgba(0,0,0,0.8)]"
              />
            </div>
          </div>
        )}

        {/* Dynamic Page Content Canvas */}
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 overflow-y-auto min-h-0 focus:outline-none"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
