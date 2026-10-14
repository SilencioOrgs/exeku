"use client";

import React, { useState, useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useProfile } from "@/hooks/use-profile";
import { AppSidebar } from "./app-sidebar";
import { AppTopbar } from "./app-topbar";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";

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
  try { return localStorage.getItem("exeku:sidebar-collapsed") === "true"; }
  catch { return false; }
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
      try {
        localStorage.setItem("exeku:sidebar-collapsed", String(next));
        window.dispatchEvent(new Event("storage"));
      } catch { /* Keep the sidebar usable when browser storage is denied. */ }
    }
  };

  const blocked = isLoading || !profile;

  return (
    <div className="app-shell min-h-screen bg-[var(--color-canvas)] text-[var(--color-text-main)] flex flex-col overflow-hidden relative">
      {blocked && (
      <div role="status" aria-live="polite" className="min-h-screen bg-[var(--color-canvas)] flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[var(--color-accent)] border-t-transparent animate-spin" />
          <span className="font-mono text-xs text-[var(--color-accent)] uppercase tracking-widest animate-pulse">
            LOADING LOCAL WORKSPACE...
          </span>
        </div>
      </div>
      )}
      {/* Background Pixel Grid Pattern */}
      <div
        className="arcade-decoration absolute inset-0 pointer-events-none opacity-20 z-0"
        style={{
          backgroundImage:
            "linear-gradient(to right, var(--color-border) 1px, transparent 1px), linear-gradient(to bottom, var(--color-border) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      {/* Top Application Bar */}
      {!blocked && <AppTopbar
        profile={profile}
        onToggleMobileMenu={() => setMobileOpen((o) => !o)}
      />}

      {/* Main Workspace Frame */}
      <div className="flex-1 flex min-w-0 overflow-hidden relative z-10">
        {/* Desktop Collapsible Sidebar */}
        {!blocked && <AppSidebar
          profile={profile}
          collapsed={collapsed}
          onToggleCollapse={toggleCollapse}
          className="hidden lg:flex"
        />}

        {/* Mobile Slide-Out Drawer with Backdrop */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" showCloseButton={false} style={{ width: "16rem", maxWidth: "80vw" }}>
            <SheetTitle className="sr-only">Mobile navigation</SheetTitle>
            <SheetDescription className="sr-only">Choose a workspace page. Press Escape to close navigation.</SheetDescription>
              <AppSidebar
                profile={profile}
                collapsed={false}
                onToggleCollapse={() => setMobileOpen(false)}
                onNavigate={() => setMobileOpen(false)}
                className="w-full h-full [box-shadow:var(--shadow-btn)]"
              />
          </SheetContent>
        </Sheet>

        {/* Dynamic Page Content Canvas */}
        <main
          id="main-content"
          hidden={blocked}
          inert={blocked}
          tabIndex={-1}
          className="flex-1 min-w-0 overflow-y-auto min-h-0 focus:outline-none"
        >
          <div className="app-content">{children}</div>
        </main>
      </div>
    </div>
  );
}
