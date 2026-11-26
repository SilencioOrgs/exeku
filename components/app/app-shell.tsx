"use client";

import React, { useState, useEffect, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { ProfileProvider, useProfile } from "@/hooks/use-profile";
import { PulseProvider, usePulse } from "@/hooks/use-pulse";
import { AppSidebar } from "./app-sidebar";
import { AppTopbar } from "./app-topbar";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { AppShellSkeleton } from "./page-skeletons";
import { TournamentLock } from "./events/tournament-lock";
import type { UserRole } from "@/types/roles";

const WelcomeDialog = dynamic(
  () => import("./school/welcome-dialog").then((mod) => mod.WelcomeDialog),
  { ssr: false },
);

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

function AppShellInner({ children }: AppShellProps) {
  const router = useRouter();
  const { profile, isLoading, updateProfile } = useProfile();

  const persistedCollapsed = useSyncExternalStore(
    subscribeSidebar,
    getSidebarSnapshot,
    getServerSidebarSnapshot
  );

  const [collapsedOverride, setCollapsedOverride] = useState<boolean | null>(null);
  const collapsed = collapsedOverride ?? persistedCollapsed;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [roleOverride, setRoleOverride] = useState<UserRole | undefined>(undefined);
  const [welcomePinned, setWelcomePinned] = useState(false);

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
    <PulseProvider enabled={!blocked}>
      <AppShellFrame
        blocked={blocked}
        profile={profile}
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        roleOverride={roleOverride}
        setRoleOverride={setRoleOverride}
        welcomePinned={welcomePinned}
        setWelcomePinned={setWelcomePinned}
        onToggleCollapse={toggleCollapse}
        onUpdateProfile={updateProfile}
      >
        {children}
      </AppShellFrame>
    </PulseProvider>
  );
}

function AppShellFrame({
  blocked,
  profile,
  collapsed,
  mobileOpen,
  setMobileOpen,
  roleOverride,
  setRoleOverride,
  welcomePinned,
  setWelcomePinned,
  onToggleCollapse,
  onUpdateProfile,
  children,
}: {
  blocked: boolean;
  profile: ReturnType<typeof useProfile>["profile"];
  collapsed: boolean;
  mobileOpen: boolean;
  setMobileOpen: React.Dispatch<React.SetStateAction<boolean>>;
  roleOverride: UserRole | undefined;
  setRoleOverride: React.Dispatch<React.SetStateAction<UserRole | undefined>>;
  welcomePinned: boolean;
  setWelcomePinned: React.Dispatch<React.SetStateAction<boolean>>;
  onToggleCollapse: () => void;
  onUpdateProfile: ReturnType<typeof useProfile>["updateProfile"];
  children: React.ReactNode;
}) {
  const pulseCtx = usePulse();
  const viewerRole = pulseCtx?.pulse?.role ?? roleOverride;
  const shouldMountWelcome = !blocked && profile !== null && ((!profile.userType && !profile.account) || welcomePinned);

  return (
    <div className="app-shell h-screen max-h-screen bg-[var(--color-canvas)] text-[var(--color-text-main)] flex flex-col overflow-hidden relative">
      {blocked && <AppShellSkeleton />}
      {!blocked && <TournamentLock />}
      {shouldMountWelcome && (
        <WelcomeDialog
          profile={profile}
          onUpdate={(updates) => {
            setWelcomePinned(true);
            return onUpdateProfile(profile.id, updates);
          }}
        />
      )}
      {/* Top Application Bar */}
      {!blocked && <AppTopbar
        profile={profile}
        onRoleLoaded={setRoleOverride}
        onToggleMobileMenu={() => setMobileOpen((o) => !o)}
      />}

      {/* Main Workspace Frame */}
      <div className="flex-1 flex min-w-0 min-h-0 overflow-hidden relative z-10">
        {/* Desktop Collapsible Sidebar */}
        {!blocked && <AppSidebar
          profile={profile}
          role={viewerRole}
          collapsed={collapsed}
          onToggleCollapse={onToggleCollapse}
          className="hidden lg:flex h-full shrink-0"
        />}

        {/* Mobile Slide-Out Drawer with Backdrop */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" showCloseButton={false} style={{ width: "16rem", maxWidth: "80vw" }}>
            <SheetTitle className="sr-only">Mobile navigation</SheetTitle>
            <SheetDescription className="sr-only">Choose a workspace page. Press Escape to close navigation.</SheetDescription>
              <AppSidebar
                profile={profile}
                role={viewerRole}
                collapsed={false}
                onToggleCollapse={() => setMobileOpen(false)}
                onNavigate={() => setMobileOpen(false)}
                className="w-full h-full"
              />
          </SheetContent>
        </Sheet>

        {/* Dynamic Page Content Canvas */}
        <main
          id="main-content"
          hidden={blocked}
          inert={blocked}
          tabIndex={-1}
          className="flex-1 min-w-0 h-full overflow-y-auto min-h-0 focus:outline-none"
        >
          <div className="app-content min-h-full">{children}</div>
        </main>
      </div>
    </div>
  );
}

export function AppShell({ children }: AppShellProps) {
  return (
    <ProfileProvider>
      <AppShellInner>{children}</AppShellInner>
    </ProfileProvider>
  );
}
