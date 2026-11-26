"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Maximize, TriangleAlert } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { usePulse } from "@/hooks/use-pulse";
import { fetchActiveTournament, TOURNAMENT_REFRESH_EVENT, tournamentAction } from "@/lib/orgs/api";
import type { ActiveTournament } from "@/types/tournament";

const POLL_MS = 20000;
const REPORT_GAP_MS = 3000;
const BLOCKED_EVENTS = ["copy", "cut", "paste", "drop", "dragstart", "contextmenu"];

// Chromium only, and missing from the TypeScript DOM types. It keeps Esc and shortcuts like Ctrl+T inside the page.
const keyboardLock = () => (navigator as Navigator & { keyboard?: { lock?: () => Promise<void>; unlock?: () => void } }).keyboard;

/**
 * Locks the app while the student's tournament is live.
 * shortcut: a browser cannot truly stop another tab, app or device, so leaving is detected and recorded, use a proctored desktop app for high-stakes contests.
 */
export function TournamentLock() {
  const pathname = usePathname();
  const pulseCtx = usePulse();
  const hasSharedPulse = pulseCtx !== null;
  const [standaloneActive, setStandaloneActive] = useState<ActiveTournament | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [localExtraWarnings, setLocalExtraWarnings] = useState<{ id: string; count: number } | null>(null);
  const [notice, setNotice] = useState<string>();
  const [enterError, setEnterError] = useState<string>();
  const wasActive = useRef(false);
  const wasFullscreen = useRef(false);
  const lastReport = useRef(0);
  const overlay = useRef<HTMLDivElement>(null);

  const active: ActiveTournament | null = hasSharedPulse
    ? (pulseCtx.pulse?.activeTournament ?? null)
    : standaloneActive;
  const activeId = active?.id;
  const warnings = active
    ? Math.max(active.warnings, localExtraWarnings?.id === active.id ? localExtraWarnings.count : 0)
    : 0;

  // Fallback polling only when mounted outside PulseProvider.
  useEffect(() => {
    if (hasSharedPulse) return;
    let live = true;
    const load = () => void fetchActiveTournament().then((result) => {
      if (!live || !result.ok) return;
      setStandaloneActive(result.data.active);
    });
    const poll = () => { if (!document.hidden) load(); };
    const onVisible = () => { if (!document.hidden) load(); };
    load();
    const timer = setInterval(poll, POLL_MS);
    window.addEventListener(TOURNAMENT_REFRESH_EVENT, load);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      live = false;
      clearInterval(timer);
      window.removeEventListener(TOURNAMENT_REFRESH_EVENT, load);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [hasSharedPulse]);

  // Hand the screen back cleanly when the tournament ends or the team finishes all problems.
  useEffect(() => {
    if (wasActive.current && !activeId) {
      wasFullscreen.current = false;
      keyboardLock()?.unlock?.();
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    }
    wasActive.current = Boolean(activeId);
  }, [activeId]);

  useEffect(() => {
    if (!activeId) return;
    // One departure fires several browser events, so count it once.
    const report = (kind: "fullscreen" | "tab" | "focus", message: string) => {
      const now = Date.now();
      if (now - lastReport.current < REPORT_GAP_MS) return;
      lastReport.current = now;
      if (pulseCtx) {
        pulseCtx.noteTournamentWarning();
      } else {
        setLocalExtraWarnings((prev) => ({
          id: activeId,
          count: (prev?.id === activeId ? prev.count : (active?.warnings ?? 0)) + 1,
        }));
      }
      setNotice(message);
      void tournamentAction(activeId, { action: "violation", kind });
    };
    const onFullscreen = () => {
      const on = Boolean(document.fullscreenElement);
      setFullscreen(on);
      if (on) void keyboardLock()?.lock?.()?.catch(() => {});
      else if (wasFullscreen.current) report("fullscreen", "You left full screen. This was recorded.");
      wasFullscreen.current = on;
    };
    const onVisibility = () => { if (document.hidden) report("tab", "You left this tab. This was recorded."); };
    const onBlur = () => { if (document.fullscreenElement) report("focus", "You switched away from Exeku. This was recorded."); };
    const block = (event: Event) => event.preventDefault();

    queueMicrotask(onFullscreen);
    document.addEventListener("fullscreenchange", onFullscreen);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    BLOCKED_EVENTS.forEach((name) => document.addEventListener(name, block, true));
    return () => {
      keyboardLock()?.unlock?.();
      document.removeEventListener("fullscreenchange", onFullscreen);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      BLOCKED_EVENTS.forEach((name) => document.removeEventListener(name, block, true));
    };
  }, [activeId, active?.warnings, pulseCtx]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(undefined), 6000);
    return () => clearTimeout(timer);
  }, [notice]);

  const allowed = activeId !== undefined && (pathname === `/app/events/${activeId}` || pathname.startsWith("/app/workspace"));
  const locked = active !== null && (!fullscreen || !allowed);

  // The page behind the lock must not take typing or focus, including the code editor.
  useEffect(() => {
    if (!locked) return;
    const focusables = () => Array.from(overlay.current?.querySelectorAll<HTMLElement>("a[href],button:not([disabled]),[tabindex]:not([tabindex='-1'])") ?? []);
    focusables()[0]?.focus();
    const stopTyping = (event: KeyboardEvent) => {
      const container = overlay.current;
      if (event.key === "Tab" && container) {
        const items = focusables();
        if (items.length > 0) {
          const first = items[0];
          const last = items[items.length - 1];
          const activeEl = document.activeElement as HTMLElement | null;
          if (event.shiftKey && (activeEl === first || !container.contains(activeEl))) {
            event.preventDefault();
            last.focus();
            return;
          }
          if (!event.shiftKey && (activeEl === last || !container.contains(activeEl))) {
            event.preventDefault();
            first.focus();
            return;
          }
          return;
        }
      }
      if (container?.contains(event.target as Node)) return;
      event.preventDefault();
      event.stopPropagation();
      focusables()[0]?.focus();
    };
    document.addEventListener("keydown", stopTyping, true);
    return () => document.removeEventListener("keydown", stopTyping, true);
  }, [locked]);

  if (!active) return null;

  const enter = async () => {
    setEnterError(undefined);
    if (!document.fullscreenEnabled) { setEnterError("This browser can't go full screen. Use Chrome or Edge on a computer."); return; }
    try { await document.documentElement.requestFullscreen(); }
    catch { setEnterError("Full screen was blocked. Check your browser's permissions and try again."); }
  };
  const warningText = `${warnings} ${warnings === 1 ? "warning" : "warnings"} recorded`;

  return (
    <>
      {notice && !locked && (
        <p role="alert" className="fixed top-3 left-1/2 z-[110] flex max-w-[calc(100vw-1.5rem)] -translate-x-1/2 items-center gap-2 rounded-xl border border-[var(--color-pink)] bg-[var(--color-canvas)] px-4 py-2 text-sm">
          <TriangleAlert size={15} aria-hidden="true" className="shrink-0 text-[var(--color-pink)]" />{notice} {warningText}.
        </p>
      )}
      {locked && (
        <div ref={overlay} role="alertdialog" aria-modal="true" aria-labelledby="lock-title" aria-describedby="lock-body" className="fixed inset-0 z-[100] grid place-items-center bg-[var(--color-canvas)] p-4">
          <div className="skeuo-panel w-full max-w-md space-y-4 p-6 text-center">
            <h2 id="lock-title" className="text-xl font-semibold tracking-tight">{active.title}</h2>
            {!fullscreen ? <>
              <p id="lock-body" className="text-sm text-[var(--color-text-muted)]">The tournament is live and must be taken in full screen. Copy and paste are off. Leaving full screen or switching tabs or apps is recorded on your team&apos;s card.</p>
              <Button size="lg" className="h-10 px-5" onClick={() => void enter()}><Maximize size={15} aria-hidden="true" />Enter full screen</Button>
              {enterError && <p role="alert" className="text-xs text-[var(--color-pink)]">{enterError}</p>}
            </> : <>
              <p id="lock-body" className="text-sm text-[var(--color-text-muted)]">Other pages are closed until the tournament ends.</p>
              <Link href={`/app/events/${active.id}`} className={buttonVariants({ size: "lg" })}>Back to the tournament</Link>
            </>}
            {warnings > 0 && <p className="text-xs text-[var(--color-pink)]">{warningText}</p>}
          </div>
        </div>
      )}
    </>
  );
}
