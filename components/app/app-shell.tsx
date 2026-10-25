"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useProfile } from "@/hooks/use-profile";
import { AppTopbar } from "./app-topbar";

export interface AppShellProps {
  children: ReactNode;
}

/** Full-width application canvas. Search and mobile navigation live in AppTopbar. */
export function AppShell({ children }: AppShellProps) {
  const router = useRouter();
  const { profile, isLoading } = useProfile();

  useEffect(() => {
    if (!isLoading && !profile) router.replace("/setup");
  }, [isLoading, profile, router]);

  const blocked = isLoading || !profile;

  return (
    <div className="app-shell flex h-dvh min-h-0 flex-col overflow-hidden bg-[var(--color-canvas)] text-[var(--color-text-main)]">
      {blocked ? (
        <div role="status" aria-live="polite" className="flex min-h-14 shrink-0 items-center gap-3 border-b border-[var(--color-border)] px-4 text-sm text-[var(--color-text-muted)]">
          <span className="size-4 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-primary)]" aria-hidden="true" />
          Loading workspace…
        </div>
      ) : (
        <AppTopbar profile={profile} />
      )}
      <main
        id="main-content"
        hidden={blocked}
        inert={blocked}
        tabIndex={-1}
        className="min-h-0 min-w-0 flex-1 overflow-y-auto focus:outline-none"
      >
        <div className="app-content min-h-full">{children}</div>
      </main>
    </div>
  );
}
