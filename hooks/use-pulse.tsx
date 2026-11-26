"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { PulsePayload } from "@/app/api/pulse/route";
import { invalidateClientCache } from "@/lib/client/swr-cache";
import { TOURNAMENT_REFRESH_EVENT } from "@/lib/orgs/api";

const IDLE_POLL_MS = 30_000;
const TOURNAMENT_POLL_MS = 15_000;
const FOCUS_COOLDOWN_MS = 4_000;
const MAX_BOUNDARY_TIMER_MS = 60 * 60 * 1000;

export interface PulseContextValue {
  pulse: PulsePayload | null;
  refresh: (force?: boolean) => Promise<void>;
  /** Optimistically bump local active tournament warnings when a violation is logged. */
  noteTournamentWarning: () => void;
}

const PulseContext = createContext<PulseContextValue | null>(null);

export function PulseProvider({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  const [pulse, setPulse] = useState<PulsePayload | null>(null);
  const etagRef = useRef<string | null>(null);
  const prevRef = useRef<PulsePayload | null>(null);
  const lastFetchedAtRef = useRef(0);
  const inflightRef = useRef<Promise<void> | null>(null);

  const refresh = useCallback(async (force = false) => {
    if (!enabled) return;
    if (!force && Date.now() - lastFetchedAtRef.current < FOCUS_COOLDOWN_MS) return;
    if (inflightRef.current) return inflightRef.current;

    const run = (async () => {
      try {
        const headers: Record<string, string> = {};
        if (!force && etagRef.current) headers["If-None-Match"] = etagRef.current;
        const res = await fetch("/api/pulse", { headers });
        lastFetchedAtRef.current = Date.now();
        if (res.status === 304) return;
        if (!res.ok) return;
        const nextEtag = res.headers.get("etag");
        if (nextEtag) etagRef.current = nextEtag;
        const next = (await res.json()) as PulsePayload;
        const prev = prevRef.current;
        prevRef.current = next;
        setPulse(next);

        if (prev) {
          const invalidations: string[] = [];
          if (
            prev.notificationsUnread !== next.notificationsUnread ||
            prev.notificationsLatestAt !== next.notificationsLatestAt
          ) {
            invalidations.push("/api/notifications");
          }
          if (prev.friendRequestsCount !== next.friendRequestsCount) {
            invalidations.push("/api/friends");
          }
          if ((prev.activeTournament?.id ?? null) !== (next.activeTournament?.id ?? null)) {
            invalidations.push("/api/events", "/api/problems");
          }
          if (prev.role !== next.role) {
            invalidations.push("/api/account/faculty", "/api/classes", "/api/notifications");
          }
          if (invalidations.length > 0) {
            invalidateClientCache(invalidations, { broadcast: false });
          }
        }
      } catch {
        /* Network blips retry on the next pulse interval or focus event. */
      }
    })().finally(() => {
      inflightRef.current = null;
    });

    inflightRef.current = run;
    return run;
  }, [enabled]);

  // Initial load + adaptive polling + visibility/focus + tournament-refresh listener.
  const hasTournamentSchedule = Boolean(pulse?.activeTournament || pulse?.nextTournamentStartsAt);
  useEffect(() => {
    if (!enabled) return;
    queueMicrotask(() => { void refresh(true); });

    const intervalMs = hasTournamentSchedule ? TOURNAMENT_POLL_MS : IDLE_POLL_MS;
    const timer = window.setInterval(() => {
      if (!document.hidden) void refresh(false);
    }, intervalMs);

    const onVisible = () => {
      if (!document.hidden) void refresh(false);
    };
    const onTournamentEvent = () => {
      void refresh(true);
    };

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    window.addEventListener(TOURNAMENT_REFRESH_EVENT, onTournamentEvent);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      window.removeEventListener(TOURNAMENT_REFRESH_EVENT, onTournamentEvent);
    };
  }, [enabled, hasTournamentSchedule, refresh]);

  // Exact boundary timer so tournament lockdown engages or lifts right at startsAt / endsAt.
  const nextBoundary = pulse?.activeTournamentEndsAt ?? pulse?.nextTournamentStartsAt ?? null;
  useEffect(() => {
    if (!enabled || !nextBoundary) return;
    const delayMs = Date.parse(nextBoundary) - Date.now() + 500;
    if (Number.isNaN(delayMs) || delayMs <= 0 || delayMs > MAX_BOUNDARY_TIMER_MS) return;
    const timer = window.setTimeout(() => {
      void refresh(true);
    }, delayMs);
    return () => window.clearTimeout(timer);
  }, [enabled, nextBoundary, refresh]);

  const noteTournamentWarning = useCallback(() => {
    setPulse((cur) => {
      if (!cur?.activeTournament) return cur;
      const next: PulsePayload = {
        ...cur,
        activeTournament: { ...cur.activeTournament, warnings: cur.activeTournament.warnings + 1 },
      };
      prevRef.current = next;
      return next;
    });
  }, []);

  const value = useMemo<PulseContextValue>(
    () => ({ pulse, refresh, noteTournamentWarning }),
    [pulse, refresh, noteTournamentWarning],
  );

  return <PulseContext.Provider value={value}>{children}</PulseContext.Provider>;
}

export function usePulse(): PulseContextValue | null {
  return useContext(PulseContext);
}
