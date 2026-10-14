"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { useRouter } from "next/navigation";
import {
  type ChallengeSession,
  type ChallengeSessionStatus,
  DEFAULT_CHALLENGE_DURATION_MS,
  CHALLENGE_STORAGE_KEY,
} from "@/types/challenge";

export interface ChallengeContextValue {
  session: ChallengeSession | null;
  status: ChallengeSessionStatus;
  remainingMs: number;
  formattedTime: string;
  isTimedActive: boolean;
  isWarningTime: boolean; // Less than 30 seconds
  hasSubmittedAtLeastOnce: boolean;
  startChallenge: (
    problemId: string,
    problemTitle: string,
    durationMs?: number
  ) => ChallengeSession;
  recordSubmissionAttempt: (verdict?: string) => void;
  finishChallenge: () => boolean;
  forfeitChallenge: () => void;
  resetChallenge: () => void;
  // Navigation guard
  navigationPendingHref: string | null;
  requestNavigation: (href: string) => boolean;
  confirmPendingNavigation: () => void;
  cancelPendingNavigation: () => void;
}

const ChallengeContext = createContext<ChallengeContextValue | null>(null);

export function formatRemainingTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function loadPersistedSession(): ChallengeSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CHALLENGE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ChallengeSession;
    if (!parsed || typeof parsed !== "object" || !parsed.id || !parsed.deadline) {
      return null;
    }
    // Check if expired while away
    if (Date.now() >= parsed.deadline && (parsed.status === "active" || parsed.status === "submitting" || parsed.status === "submitted")) {
      parsed.status = "expired";
      localStorage.setItem(CHALLENGE_STORAGE_KEY, JSON.stringify(parsed));
    }
    return parsed;
  } catch {
    return null;
  }
}

function persistSession(session: ChallengeSession | null) {
  if (typeof window === "undefined") return;
  try {
    if (session) {
      localStorage.setItem(CHALLENGE_STORAGE_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(CHALLENGE_STORAGE_KEY);
    }
  } catch {
    // Keep working in memory if storage is unavailable
  }
}

export function ChallengeProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [session, setSession] = useState<ChallengeSession | null>(null);
  const [remainingMs, setRemainingMs] = useState<number>(0);
  const [navigationPendingHref, setNavigationPendingHref] = useState<string | null>(null);

  const sessionRef = useRef<ChallengeSession | null>(session);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  // Hydrate from storage on mount
  useEffect(() => {
    const loaded = loadPersistedSession();
    if (loaded) {
      sessionRef.current = loaded;
      const remaining = Math.max(0, loaded.deadline - Date.now());
      queueMicrotask(() => {
        setSession(loaded);
        setRemainingMs(remaining);
      });
    }
  }, []);

  // Timer tick
  useEffect(() => {
    if (
      !session ||
      (session.status !== "active" &&
        session.status !== "submitting" &&
        session.status !== "submitted")
    ) {
      return;
    }

    const checkTimer = () => {
      const current = sessionRef.current;
      if (!current) return;
      const left = Math.max(0, current.deadline - Date.now());
      setRemainingMs(left);

      if (
        left <= 0 &&
        (current.status === "active" ||
          current.status === "submitting" ||
          current.status === "submitted")
      ) {
        const expiredSession: ChallengeSession = {
          ...current,
          status: "expired",
          completedAt: Date.now(),
        };
        sessionRef.current = expiredSession;
        setSession(expiredSession);
        persistSession(expiredSession);
      }
    };

    checkTimer();
    const interval = setInterval(checkTimer, 500);

    // Sync on tab focus / wake
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkTimer();
      }
    };
    window.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [session]);

  const startChallenge = useCallback(
    (problemId: string, problemTitle: string, durationMs = DEFAULT_CHALLENGE_DURATION_MS): ChallengeSession => {
      const now = Date.now();
      const newSession: ChallengeSession = {
        id: `challenge-${now}-${Math.random().toString(36).slice(2, 7)}`,
        problemId,
        problemTitle,
        durationMs,
        startedAt: now,
        deadline: now + durationMs,
        status: "active",
        submissionCount: 0,
        lastVerdict: null,
      };

      setSession(newSession);
      setRemainingMs(durationMs);
      persistSession(newSession);
      return newSession;
    },
    []
  );

  const recordSubmissionAttempt = useCallback((verdict?: string) => {
    setSession((prev) => {
      if (!prev || (prev.status !== "active" && prev.status !== "submitting" && prev.status !== "submitted")) {
        return prev;
      }
      const updated: ChallengeSession = {
        ...prev,
        status: "submitted",
        submissionCount: prev.submissionCount + 1,
        lastVerdict: verdict || prev.lastVerdict,
      };
      persistSession(updated);
      return updated;
    });
  }, []);

  const finishChallenge = useCallback((): boolean => {
    const current = sessionRef.current;
    if (!current) return false;
    // Requirement: at least 1 submission attempt before ordinary finish
    if (current.submissionCount < 1) {
      return false;
    }

    const finished: ChallengeSession = {
      ...current,
      status: "completed",
      completedAt: Date.now(),
    };
    setSession(finished);
    persistSession(finished);
    return true;
  }, []);

  const forfeitChallenge = useCallback(() => {
    setSession((prev) => {
      if (!prev) return null;
      const forfeited: ChallengeSession = {
        ...prev,
        status: "forfeited",
        completedAt: Date.now(),
      };
      persistSession(forfeited);
      return forfeited;
    });
  }, []);

  const resetChallenge = useCallback(() => {
    setSession(null);
    setRemainingMs(0);
    persistSession(null);
  }, []);

  // Navigation Guard Implementation
  const requestNavigation = useCallback((href: string): boolean => {
    const current = sessionRef.current;
    const isLocked =
      current &&
      (current.status === "active" ||
        current.status === "submitting" ||
        current.status === "submitted");

    if (isLocked) {
      setNavigationPendingHref(href);
      return false; // Intercepted
    }
    return true; // Allowed
  }, []);

  const confirmPendingNavigation = useCallback(() => {
    const href = navigationPendingHref;
    forfeitChallenge();
    setNavigationPendingHref(null);
    if (href) {
      router.push(href);
    }
  }, [navigationPendingHref, forfeitChallenge, router]);

  const cancelPendingNavigation = useCallback(() => {
    setNavigationPendingHref(null);
  }, []);

  const status = session?.status ?? "idle";
  const isTimedActive =
    status === "active" || status === "submitting" || status === "submitted";
  const isWarningTime = isTimedActive && remainingMs <= 30000 && remainingMs > 0;
  const hasSubmittedAtLeastOnce = (session?.submissionCount ?? 0) > 0;
  const formattedTime = formatRemainingTime(remainingMs);

  const contextValue = useMemo<ChallengeContextValue>(
    () => ({
      session,
      status,
      remainingMs,
      formattedTime,
      isTimedActive,
      isWarningTime,
      hasSubmittedAtLeastOnce,
      startChallenge,
      recordSubmissionAttempt,
      finishChallenge,
      forfeitChallenge,
      resetChallenge,
      navigationPendingHref,
      requestNavigation,
      confirmPendingNavigation,
      cancelPendingNavigation,
    }),
    [
      session,
      status,
      remainingMs,
      formattedTime,
      isTimedActive,
      isWarningTime,
      hasSubmittedAtLeastOnce,
      startChallenge,
      recordSubmissionAttempt,
      finishChallenge,
      forfeitChallenge,
      resetChallenge,
      navigationPendingHref,
      requestNavigation,
      confirmPendingNavigation,
      cancelPendingNavigation,
    ]
  );

  return (
    <ChallengeContext.Provider value={contextValue}>
      {children}
    </ChallengeContext.Provider>
  );
}

export function useChallengeSession(): ChallengeContextValue {
  const context = useContext(ChallengeContext);
  if (!context) {
    throw new Error(
      "useChallengeSession must be used within a ChallengeProvider"
    );
  }
  return context;
}
