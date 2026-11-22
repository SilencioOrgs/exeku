import { Skeleton } from "@/components/ui/skeleton";

function SkeletonShell({ label, maxWidth = "max-w-4xl", children }: { label: string; maxWidth?: string; children: React.ReactNode }) {
  return (
    <div role="status" aria-busy="true" className={`mx-auto w-full ${maxWidth} space-y-6 p-4 sm:p-6 lg:p-8`}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

/** Generic route transition skeleton for /app/loading.tsx. */
export function PageSkeleton({ label = "Loading page…" }: { label?: string }) {
  return (
    <SkeletonShell label={label}>
      <div className="space-y-2">
        <Skeleton className="h-8 w-44 rounded-lg" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="profile-panel flex items-center gap-4 p-5">
            <Skeleton className="size-11 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-44" />
              <Skeleton className="h-3.5 w-64 max-w-full" />
            </div>
            <Skeleton className="h-8 w-20 shrink-0 rounded-lg" />
          </div>
        ))}
      </div>
    </SkeletonShell>
  );
}

/** Skeleton rows rendered inside FriendsView below the live header and search bar. */
export function FriendsContentSkeleton() {
  return (
    <div role="status" aria-busy="true" className="space-y-6">
      <span className="sr-only">Finding your friends…</span>
      {[0, 1].map((section) => (
        <div key={section} className="space-y-3">
          <Skeleton className="h-5 w-40" />
          <div className="space-y-3">
            {[0, 1, 2].slice(0, section === 0 ? 3 : 2).map((row) => (
              <div key={row} className="profile-panel flex items-center gap-4 p-4">
                <Skeleton className="m-1.5 size-11 shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-52 max-w-full" />
                </div>
                <Skeleton className="size-8 shrink-0 rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Skeleton cards rendered inside /app/orgs Suspense fallback below the static header. */
export function OrgsListSkeleton() {
  return (
    <div role="status" aria-busy="true" className="space-y-3">
      <span className="sr-only">Loading organizations…</span>
      {[0, 1, 2].map((i) => (
        <div key={i} className="profile-panel space-y-2.5 p-5">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-72 max-w-full" />
          <Skeleton className="h-3.5 w-24" />
        </div>
      ))}
    </div>
  );
}

/** Full leaderboard skeleton for /app/leaderboard Suspense fallback. */
export function LeaderboardSkeleton() {
  return (
    <SkeletonShell label="Loading leaderboard…">
      <div className="space-y-2">
        <Skeleton className="h-8 w-44 rounded-lg" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="flex flex-wrap gap-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-lg" />
        ))}
      </div>
      <div className="skeuo-card overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="divide-y divide-[var(--color-border)]">
          {[0, 1, 2, 3, 4, 5].map((row) => (
            <div key={row} className="flex items-center gap-4 px-4 py-3.5">
              <Skeleton className="h-4 w-7 shrink-0" />
              <Skeleton className="size-9 shrink-0 rounded-lg" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-28" />
              </div>
              <Skeleton className="h-4 w-14 shrink-0" />
              <Skeleton className="h-4 w-16 shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </SkeletonShell>
  );
}

/** Skeleton cards rendered inside EventsView below the live header and filters. */
export function EventsListSkeleton() {
  return (
    <div role="status" aria-busy="true" className="space-y-3">
      <span className="sr-only">Loading events…</span>
      <Skeleton className="h-5 w-28" />
      {[0, 1].map((i) => (
        <div key={i} className="profile-panel overflow-hidden">
          <Skeleton className="aspect-[3/1] max-h-44 w-full rounded-none" />
          <div className="space-y-2.5 p-5">
            <div className="flex items-center justify-between gap-4">
              <Skeleton className="h-5 w-52" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-4 w-full max-w-lg" />
            <Skeleton className="h-3.5 w-44" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Skeleton grid rendered inside ClassesView while classes load. */
export function ClassesGridSkeleton() {
  return (
    <div role="status" aria-busy="true" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <span className="sr-only">Loading classes…</span>
      {[0, 1, 2].map((i) => (
        <div key={i} className="skeuo-panel space-y-4 p-5">
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3.5 w-32" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[0, 1, 2].map((stat) => (
              <div key={stat} className="skeuo-well space-y-1.5 rounded-lg border px-2.5 py-2">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-5 w-8" />
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between gap-2">
            <Skeleton className="h-8 w-24 rounded-lg" />
            <Skeleton className="h-8 w-24 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Skeleton rows rendered inside the ChallengesView table container. */
export function ChallengesTableSkeleton() {
  return (
    <div role="status" aria-busy="true" className="divide-y divide-[var(--color-border)]">
      <span className="sr-only">Loading problems…</span>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3.5">
          <Skeleton className="h-4 w-6 shrink-0" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-4 w-48 max-w-full" />
            <Skeleton className="h-3 w-28" />
          </div>
          <Skeleton className="hidden h-5 w-20 rounded-md sm:block" />
          <Skeleton className="h-8 w-20 shrink-0 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

/** Skeleton for detail routes (/app/orgs/[id], /app/friends/[id], /app/classes/[id], /app/events/[id]). */
export function DetailPageSkeleton({ label = "Loading…", maxWidth = "max-w-4xl" }: { label?: string; maxWidth?: string }) {
  return (
    <SkeletonShell label={label} maxWidth={maxWidth}>
      <Skeleton className="h-4 w-28" />
      <div className="space-y-2">
        <Skeleton className="h-8 w-56 rounded-lg" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="skeuo-panel space-y-4 p-6">
        <Skeleton className="h-5 w-36" />
        <div className="grid gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeuo-well space-y-2 rounded-lg border p-3.5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-6 w-12" />
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="profile-panel flex items-center gap-4 p-4">
            <Skeleton className="size-10 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-56 max-w-full" />
            </div>
          </div>
        ))}
      </div>
    </SkeletonShell>
  );
}

/** Full-frame shell skeleton rendered while local profile initializes, replacing the old Exeku keycap splash. */
export function AppShellSkeleton() {
  return (
    <div role="status" aria-busy="true" className="flex h-screen w-full flex-col bg-[var(--color-canvas)]">
      <span className="sr-only">Loading your workspace…</span>
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-6 w-24 rounded-md" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="size-8 rounded-lg" />
          <Skeleton className="hidden h-4 w-16 sm:block" />
        </div>
      </div>
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="hidden w-56 shrink-0 flex-col gap-3 border-r border-[var(--color-border)] bg-[var(--color-surface)] p-3 lg:flex">
          <div className="flex items-center gap-3 border-b border-[var(--color-border)] pb-3">
            <Skeleton className="size-9 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-10 w-full rounded-lg" />
          ))}
        </div>
        <div className="min-w-0 flex-1 overflow-hidden">
          <PageSkeleton label="Loading workspace…" />
        </div>
      </div>
    </div>
  );
}

/** Three-pane skeleton for /app/workspace Suspense fallback. */
export function WorkspaceSkeleton() {
  return (
    <div role="status" aria-busy="true" className="flex h-full flex-col gap-3 p-3">
      <span className="sr-only">Loading coding workspace…</span>
      <div className="flex items-center justify-between gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-40 rounded-lg" />
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-20 rounded-lg" />
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
      </div>
      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[1fr_1.35fr]">
        <div className="skeuo-panel space-y-3 p-5">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
          <Skeleton className="mt-4 h-24 w-full rounded-lg" />
        </div>
        <div className="flex flex-col gap-3">
          <div className="skeuo-panel flex-1 space-y-2.5 p-5">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-5/6" />
          </div>
          <div className="skeuo-panel h-40 space-y-2 p-4">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-16 w-full rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}

