"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from "react";
import { type AppearancePreferences, type UIStyle, type ColorPalette, type ColorMode, type ContrastMode, DEFAULT_APPEARANCE_PREFERENCES, normalizeAppearancePreferences } from "@/types/appearance";
import { appearanceRepository, cacheAppearanceSnapshot, APPEARANCE_STORAGE_KEY, APPEARANCE_SNAPSHOT_KEY, type PersistenceStatus } from "@/lib/storage/appearance-repository";
import { profileRepository } from "@/lib/storage/profile-repository";

export interface AppearanceContextValue {
  preferences: AppearancePreferences;
  preferenceOwner: string | null;
  effectiveColorMode: "dark" | "light";
  effectiveReducedMotion: boolean;
  systemColorMode: 'light' | 'dark';
  systemReducedMotion: boolean;
  persistenceStatus: PersistenceStatus;
  persistenceMessage: string | null;
  updatePreferences: (updates: Partial<AppearancePreferences>) => Promise<boolean>;
  resetPreferences: () => Promise<boolean>;
  setStyle: (style: UIStyle) => Promise<boolean>;
  setPalette: (palette: ColorPalette) => Promise<boolean>;
  setColorMode: (mode: ColorMode) => Promise<boolean>;
  setContrastMode: (contrast: ContrastMode) => Promise<boolean>;
}

const AppearanceContext = createContext<AppearanceContextValue | null>(null);

export function applyPreferencesToDom(prefs: AppearancePreferences, effectiveColorMode: "dark" | "light", systemReducedMotion: boolean) {
  const root = document.documentElement;
  // Keep legacy saved preferences intact; only the supported neutral interface is rendered.
  root.dataset.uiStyle = "minimal-saas";
  root.dataset.palette = "monochrome";
  root.dataset.colorMode = effectiveColorMode;
  root.dataset.contrast = prefs.contrastMode;
  root.dataset.uiFont = prefs.uiFontFamily === "pixelify-sans" ? "geist-sans" : prefs.uiFontFamily;
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
  const [preferenceOwner, setPreferenceOwner] = useState<string | null>(null);
  const [systemDark, setSystemDark] = useState(true);
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

  const resetPreferences = useCallback(() => updatePreferences(DEFAULT_APPEARANCE_PREFERENCES), [updatePreferences]);
  const setStyle = useCallback((uiStyle: UIStyle) => updatePreferences({ uiStyle }), [updatePreferences]);
  const setPalette = useCallback((colorPalette: ColorPalette) => updatePreferences({ colorPalette }), [updatePreferences]);
  const setColorMode = useCallback((colorMode: ColorMode) => updatePreferences({ colorMode }), [updatePreferences]);
  const setContrastMode = useCallback((contrastMode: ContrastMode) => updatePreferences({ contrastMode }), [updatePreferences]);
  const effectiveReducedMotion = preferences.reducedMotion === "system" ? systemReducedMotion : preferences.reducedMotion;
  const persistenceMessage = persistenceStatus === "error"
    ? "Changes were not applied. Local storage failed; your draft is available to retry."
    : persistenceStatus === "session" ? "Changes cannot be applied because persistent browser storage is unavailable."
    : persistenceStatus === "saving" ? "Saving appearance…"
    : persistenceStatus === "loading" ? "Loading appearance…" : "Appearance saved locally.";
  const contextValue = useMemo<AppearanceContextValue>(() => ({ preferences, preferenceOwner, effectiveColorMode, effectiveReducedMotion, systemColorMode: systemDark ? "dark" : "light", systemReducedMotion, persistenceStatus, persistenceMessage, updatePreferences, resetPreferences, setStyle, setPalette, setColorMode, setContrastMode }), [preferences, preferenceOwner, effectiveColorMode, effectiveReducedMotion, systemDark, systemReducedMotion, persistenceStatus, persistenceMessage, updatePreferences, resetPreferences, setStyle, setPalette, setColorMode, setContrastMode]);
  return <AppearanceContext.Provider value={contextValue}>{children}</AppearanceContext.Provider>;
}

export function useAppearance(): AppearanceContextValue {
  const context = useContext(AppearanceContext);
  if (!context) throw new Error("useAppearance must be used within an AppearanceProvider");
  return context;
}
