"use client";

import React, { Suspense, createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from "react";
import { usePathname } from "next/navigation";
import { type AppearancePreferences, DEFAULT_APPEARANCE_PREFERENCES, normalizeAppearancePreferences } from "@/types/appearance";
import { appearanceRepository, cacheAppearanceSnapshot, APPEARANCE_STORAGE_KEY, APPEARANCE_SNAPSHOT_KEY, type PersistenceStatus } from "@/lib/storage/appearance-repository";
import { profileRepository } from "@/lib/storage/profile-repository";

export interface AppearanceContextValue {
  preferences: AppearancePreferences;
  preferenceOwner: string | null;
  effectiveColorMode: "dark" | "light";
  effectiveReducedMotion: boolean;
  systemReducedMotion: boolean;
  persistenceStatus: PersistenceStatus;
  persistenceMessage: string | null;
  updatePreferences: (updates: Partial<AppearancePreferences>) => Promise<boolean>;
}

const AppearanceContext = createContext<AppearanceContextValue | null>(null);

export function applyPreferencesToDom(prefs: AppearancePreferences, effectiveColorMode: "dark" | "light", systemReducedMotion: boolean) {
  const root = document.documentElement;
  // Keep legacy saved preferences intact; only the supported neutral interface is rendered.
  root.dataset.uiStyle = "minimal-saas";
  root.dataset.palette = "monochrome";
  root.dataset.colorMode = effectiveColorMode;
  root.dataset.uiFont = prefs.uiFontFamily === "pixelify-sans" ? "geist-sans" : prefs.uiFontFamily;
  root.dataset.editorFont = prefs.editorFontFamily;
  root.dataset.lineHeight = prefs.lineHeight;
  root.dataset.density = prefs.density;
  root.dataset.reducedMotion = String(prefs.reducedMotion === "system" ? systemReducedMotion : prefs.reducedMotion);
  // Sync Tailwind .dark class for Base UI primitives
  root.classList.toggle("dark", effectiveColorMode === "dark");
  root.style.setProperty("--ui-font-scale", String(prefs.uiFontScale) + "%");
}

/** Tracks client-side route transitions inside Suspense so Cache Component routes can still prerender. */
function LandingThemeGuard({ onLandingChange }: { onLandingChange: (isLanding: boolean) => void }) {
  const pathname = usePathname();
  useEffect(() => {
    onLandingChange(pathname === "/");
  }, [pathname, onLandingChange]);
  return null;
}

export function AppearanceProvider({ children }: { children: React.ReactNode }) {
  // Initial markup always matches SSR; the root boot snapshot handles first-paint styling.
  const [preferences, setPreferences] = useState<AppearancePreferences>({ ...DEFAULT_APPEARANCE_PREFERENCES });
  const [preferenceOwner, setPreferenceOwner] = useState<string | null>(null);
  const [isLanding, setIsLanding] = useState(false);
  const [systemPrefersDark, setSystemPrefersDark] = useState(true);
  const [systemReducedMotion, setSystemReducedMotion] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [persistenceStatus, setPersistenceStatus] = useState<PersistenceStatus>("loading");
  const current = useRef(preferences);
  const profileId = useRef<string | null>(null);
  const profileLoaded = useRef(false);
  const initialLoad = useRef(Promise.resolve());
  const revision = useRef(0);
  const pendingWrites = useRef(Promise.resolve(true));

  useEffect(() => {
    let disposed = false;
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const colorQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleMotionChange = () => setSystemReducedMotion(motionQuery.matches);
    const handleColorChange = () => setSystemPrefersDark(colorQuery.matches);
    handleMotionChange();
    handleColorChange();
    motionQuery.addEventListener("change", handleMotionChange);
    colorQuery.addEventListener("change", handleColorChange);

    const load = async () => {
      const loadRevision = ++revision.current;
      const guest = appearanceRepository.getPreferences();
      try {
        const profile = await profileRepository.getActiveProfile();
        if (disposed || loadRevision !== revision.current) return;
        profileId.current = profile?.id ?? null;
        profileLoaded.current = true;
        setPreferenceOwner(profile?.id ?? "guest");
        // Explicit profile settings win. Legacy profiles inherit guest preferences until first edit.
        const resolved = profile?.appearancePreferences ? normalizeAppearancePreferences(profile.appearancePreferences) : guest;
        current.current = resolved;
        setPreferences(resolved);
        const persistentProfile = profile?.appearancePreferences && window.indexedDB != null;
        setPersistenceStatus(profile?.appearancePreferences ? (persistentProfile ? "saved" : "session") : appearanceRepository.persistenceStatus);
      } catch {
        if (disposed || loadRevision !== revision.current) return;
        current.current = guest;
        setPreferences(guest);
        setPersistenceStatus("error");
      } finally {
        if (!disposed && loadRevision === revision.current) setHydrated(true);
      }
    };
    initialLoad.current = load();
    const storageChanged = (event: StorageEvent) => {
      if (event.key === APPEARANCE_STORAGE_KEY || event.key === APPEARANCE_SNAPSHOT_KEY || event.key === null) { setPersistenceStatus("loading"); void pendingWrites.current.then(load); }
    };
    const profileChanged = () => { setPersistenceStatus("loading"); void pendingWrites.current.then(load); };
    window.addEventListener("storage", storageChanged);
    window.addEventListener("exeku:profile-changed", profileChanged);
    return () => {
      disposed = true;
      motionQuery.removeEventListener("change", handleMotionChange);
      colorQuery.removeEventListener("change", handleColorChange);
      window.removeEventListener("storage", storageChanged);
      window.removeEventListener("exeku:profile-changed", profileChanged);
    };
  }, []);

  const resolvedColorMode = appearanceRepository.resolveEffectiveColorMode(preferences.colorMode, systemPrefersDark);
  const effectiveColorMode: "dark" | "light" = isLanding ? "dark" : resolvedColorMode;
  useEffect(() => {
    if (!hydrated) return;
    applyPreferencesToDom(preferences, effectiveColorMode, systemReducedMotion);
    if (persistenceStatus !== "saving" && persistenceStatus !== "loading") cacheAppearanceSnapshot(preferences);
  }, [preferences, effectiveColorMode, systemReducedMotion, hydrated, persistenceStatus]);

  const updatePreferences = useCallback((updates: Partial<AppearancePreferences>): Promise<boolean> => {
    setPersistenceStatus("saving");
    // Serialize writes so rapid slider changes cannot persist an older value last.
    const write = pendingWrites.current.then(async () => {
      try {
        await initialLoad.current;
        if (!profileLoaded.current) {
          const profile = await profileRepository.getActiveProfile();
          profileId.current = profile?.id ?? null;
          setPreferenceOwner(profile?.id ?? "guest");
          current.current = profile?.appearancePreferences ? normalizeAppearancePreferences(profile.appearancePreferences) : appearanceRepository.getPreferences();
          profileLoaded.current = true;
        }
        // Apply early edits to canonical preferences, never to server-rendered defaults.
        const next = normalizeAppearancePreferences({ ...current.current, ...updates });
        ++revision.current;
        const id = profileId.current;
        if (id) {
          if (window.indexedDB == null) { setPersistenceStatus("session"); return false; }
          await profileRepository.saveAppearancePreferences(id, next);
        } else if (!appearanceRepository.commitPreferences(next)) {
          setPersistenceStatus(appearanceRepository.persistenceStatus);
          return false;
        }
        current.current = next;
        setPreferences(next);
        setHydrated(true);
        setPersistenceStatus("saved");
        return true;
      } catch {
        setPersistenceStatus("error");
        return false;
      }
    });
    pendingWrites.current = write;
    return write;
  }, []);

  const effectiveReducedMotion = preferences.reducedMotion === "system" ? systemReducedMotion : preferences.reducedMotion;
  const persistenceMessage = persistenceStatus === "error"
    ? "Changes were not applied. Local storage failed; your draft is available to retry."
    : persistenceStatus === "session" ? "Changes cannot be applied because persistent browser storage is unavailable."
    : persistenceStatus === "saving" ? "Saving appearance…"
    : persistenceStatus === "loading" ? "Loading appearance…" : "Appearance saved locally.";
  const contextValue = useMemo<AppearanceContextValue>(() => ({ preferences, preferenceOwner, effectiveColorMode, effectiveReducedMotion, systemReducedMotion, persistenceStatus, persistenceMessage, updatePreferences }), [preferences, preferenceOwner, effectiveColorMode, effectiveReducedMotion, systemReducedMotion, persistenceStatus, persistenceMessage, updatePreferences]);
  return (
    <AppearanceContext.Provider value={contextValue}>
      <Suspense fallback={null}>
        <LandingThemeGuard onLandingChange={setIsLanding} />
      </Suspense>
      {children}
    </AppearanceContext.Provider>
  );
}

export function useAppearance(): AppearanceContextValue {
  const context = useContext(AppearanceContext);
  if (!context) throw new Error("useAppearance must be used within an AppearanceProvider");
  return context;
}
