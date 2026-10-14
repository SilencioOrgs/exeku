"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from "react";
import { type AppearancePreferences, type UIStyle, type ColorMode, type ContrastMode, DEFAULT_APPEARANCE_PREFERENCES, normalizeAppearancePreferences } from "@/types/appearance";
import { appearanceRepository, cacheAppearanceSnapshot, APPEARANCE_STORAGE_KEY, APPEARANCE_SNAPSHOT_KEY, type PersistenceStatus } from "@/lib/storage/appearance-repository";
import { profileRepository } from "@/lib/storage/profile-repository";

export interface AppearanceContextValue {
  preferences: AppearancePreferences;
  effectiveColorMode: "dark" | "light";
  effectiveReducedMotion: boolean;
  persistenceStatus: PersistenceStatus;
  persistenceMessage: string | null;
  updatePreferences: (updates: Partial<AppearancePreferences>) => void;
  resetPreferences: () => void;
  setStyle: (style: UIStyle) => void;
  setColorMode: (mode: ColorMode) => void;
  setContrastMode: (contrast: ContrastMode) => void;
}

const AppearanceContext = createContext<AppearanceContextValue | null>(null);

export function applyPreferencesToDom(prefs: AppearancePreferences, effectiveColorMode: "dark" | "light", systemReducedMotion: boolean) {
  const root = document.documentElement;
  root.dataset.uiStyle = prefs.uiStyle;
  root.dataset.colorMode = effectiveColorMode;
  root.dataset.contrast = prefs.contrastMode;
  root.dataset.uiFont = prefs.uiFontFamily;
  root.dataset.editorFont = prefs.editorFontFamily;
  root.dataset.lineHeight = prefs.lineHeight;
  root.dataset.density = prefs.density;
  root.dataset.reducedMotion = String(prefs.reducedMotion === "system" ? systemReducedMotion : prefs.reducedMotion);
  // Sync Tailwind .dark class for Base UI primitives
  root.classList.toggle("dark", effectiveColorMode === "dark");
  // Set CSS variables for scaling and brightness
  const brightness = prefs.contrastMode === "high" ? 100 : prefs.brightness;
  root.style.setProperty("--ui-font-scale", String(prefs.uiFontScale) + "%");
  root.style.setProperty("--app-brightness", String(brightness) + "%");
  root.style.setProperty("--brightness-factor", String(brightness / 100));
}

export function AppearanceProvider({ children }: { children: React.ReactNode }) {
  // Initial markup always matches SSR; the root boot snapshot handles first-paint styling.
  const [preferences, setPreferences] = useState<AppearancePreferences>({ ...DEFAULT_APPEARANCE_PREFERENCES });
  const [systemDark, setSystemDark] = useState(true);
  const [systemReducedMotion, setSystemReducedMotion] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [persistenceStatus, setPersistenceStatus] = useState<PersistenceStatus>("loading");
  const current = useRef(preferences);
  const profileId = useRef<string | null>(null);
  const profileLoaded = useRef(false);
  const initialLoad = useRef(Promise.resolve());
  const hydrationBase = useRef(preferences);
  const hydrationUpdates = useRef<Partial<AppearancePreferences>>({});
  const revision = useRef(0);
  const sessionProfiles = useRef(new Map<string, AppearancePreferences>());
  const pendingWrites = useRef(Promise.resolve());

  useEffect(() => {
    let disposed = false;
    const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleSchemeChange = () => setSystemDark(darkQuery.matches);
    const handleMotionChange = () => setSystemReducedMotion(motionQuery.matches);
    handleSchemeChange();
    handleMotionChange();
    darkQuery.addEventListener("change", handleSchemeChange);
    motionQuery.addEventListener("change", handleMotionChange);

    const load = async () => {
      const loadRevision = ++revision.current;
      const guest = appearanceRepository.getPreferences();
      try {
        const profile = await profileRepository.getActiveProfile();
        if (disposed) return;
        profileId.current = profile?.id ?? null;
        const initializing = !profileLoaded.current;
        profileLoaded.current = true;
        // Explicit profile settings win. Legacy profiles inherit guest preferences until first edit.
        const session = profile ? sessionProfiles.current.get(profile.id) : undefined;
        const resolved = session ?? (profile?.appearancePreferences ? normalizeAppearancePreferences(profile.appearancePreferences) : guest);
        if (initializing) hydrationBase.current = resolved;
        if (loadRevision !== revision.current) {
          if (initializing) {
            current.current = normalizeAppearancePreferences({ ...resolved, ...hydrationUpdates.current });
            setPreferences(current.current);
          }
          return;
        }
        current.current = resolved;
        setPreferences(resolved);
        const persistentProfile = profile?.appearancePreferences && window.indexedDB != null;
        setPersistenceStatus(session ? "error" : profile?.appearancePreferences ? (persistentProfile ? "saved" : "session") : appearanceRepository.persistenceStatus);
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
      if (event.key === APPEARANCE_STORAGE_KEY || event.key === APPEARANCE_SNAPSHOT_KEY || event.key === null) void load();
    };
    const profileChanged = () => { void pendingWrites.current.then(load); };
    window.addEventListener("storage", storageChanged);
    window.addEventListener("exeku:profile-changed", profileChanged);
    return () => {
      disposed = true;
      darkQuery.removeEventListener("change", handleSchemeChange);
      motionQuery.removeEventListener("change", handleMotionChange);
      window.removeEventListener("storage", storageChanged);
      window.removeEventListener("exeku:profile-changed", profileChanged);
    };
  }, []);

  const effectiveColorMode = appearanceRepository.resolveEffectiveColorMode(preferences.colorMode, systemDark);
  useEffect(() => {
    if (!hydrated) return;
    applyPreferencesToDom(preferences, effectiveColorMode, systemReducedMotion);
    if (persistenceStatus !== "saving" && persistenceStatus !== "loading") cacheAppearanceSnapshot(preferences);
  }, [preferences, effectiveColorMode, systemReducedMotion, hydrated, persistenceStatus]);

  const updatePreferences = useCallback((updates: Partial<AppearancePreferences>) => {
    const next = normalizeAppearancePreferences({ ...current.current, ...updates });
    const updateRevision = ++revision.current;
    const initializing = !profileLoaded.current;
    if (initializing) hydrationUpdates.current = { ...hydrationUpdates.current, ...updates };
    const pendingUpdates = { ...hydrationUpdates.current };
    current.current = next;
    setPreferences(next);
    setHydrated(true);
    if (profileId.current) sessionProfiles.current.set(profileId.current, next);
    setPersistenceStatus("saving");
    // Serialize writes so rapid slider changes cannot persist an older value last.
    pendingWrites.current = pendingWrites.current.then(async () => {
      try {
        await initialLoad.current;
        if (!profileLoaded.current) {
          const profile = await profileRepository.getActiveProfile();
          profileId.current = profile?.id ?? null;
          hydrationBase.current = profile?.appearancePreferences ? normalizeAppearancePreferences(profile.appearancePreferences) : appearanceRepository.getPreferences();
          profileLoaded.current = true;
        }
        // Apply early edits to canonical preferences, never to server-rendered defaults.
        const resolvedNext = initializing ? normalizeAppearancePreferences({ ...hydrationBase.current, ...pendingUpdates }) : next;
        if (updateRevision === revision.current) {
          current.current = resolvedNext;
          setPreferences(resolvedNext);
        }
        const id = profileId.current;
        if (!id) {
          appearanceRepository.savePreferences(resolvedNext);
          if (updateRevision === revision.current) setPersistenceStatus(appearanceRepository.persistenceStatus);
          return;
        }
        if (updateRevision === revision.current || !sessionProfiles.current.has(id)) sessionProfiles.current.set(id, resolvedNext);
        await profileRepository.saveAppearancePreferences(id, resolvedNext);
        if (sessionProfiles.current.get(id) === resolvedNext) sessionProfiles.current.delete(id);
        if (updateRevision === revision.current) {
          setPersistenceStatus(window.indexedDB == null ? "session" : "saved");
        }
      } catch {
        if (updateRevision === revision.current) setPersistenceStatus("error");
      }
    });
  }, []);

  const resetPreferences = useCallback(() => updatePreferences(DEFAULT_APPEARANCE_PREFERENCES), [updatePreferences]);
  const setStyle = useCallback((uiStyle: UIStyle) => updatePreferences({ uiStyle }), [updatePreferences]);
  const setColorMode = useCallback((colorMode: ColorMode) => updatePreferences({ colorMode }), [updatePreferences]);
  const setContrastMode = useCallback((contrastMode: ContrastMode) => updatePreferences({ contrastMode }), [updatePreferences]);
  const effectiveReducedMotion = preferences.reducedMotion === "system" ? systemReducedMotion : preferences.reducedMotion;
  const persistenceMessage = persistenceStatus === "error"
    ? "Appearance is active for this session. Local storage failed; changes may not survive reload."
    : persistenceStatus === "session" ? "Appearance is active for this session. Persistent storage is unavailable."
    : persistenceStatus === "saving" ? "Saving appearance…"
    : persistenceStatus === "loading" ? "Loading appearance…" : "Appearance saved locally.";
  const contextValue = useMemo<AppearanceContextValue>(() => ({ preferences, effectiveColorMode, effectiveReducedMotion, persistenceStatus, persistenceMessage, updatePreferences, resetPreferences, setStyle, setColorMode, setContrastMode }), [preferences, effectiveColorMode, effectiveReducedMotion, persistenceStatus, persistenceMessage, updatePreferences, resetPreferences, setStyle, setColorMode, setContrastMode]);
  return <AppearanceContext.Provider value={contextValue}>{children}</AppearanceContext.Provider>;
}

export function useAppearance(): AppearanceContextValue {
  const context = useContext(AppearanceContext);
  if (!context) throw new Error("useAppearance must be used within an AppearanceProvider");
  return context;
}
