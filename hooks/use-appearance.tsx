"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import {
  type AppearancePreferences,
  type UIStyle,
  type ColorMode,
  type ContrastMode,
} from "@/types/appearance";
import {
  appearanceRepository,
  APPEARANCE_CHANGE_EVENT,
} from "@/lib/storage/appearance-repository";

export interface AppearanceContextValue {
  preferences: AppearancePreferences;
  effectiveColorMode: "dark" | "light";
  updatePreferences: (updates: Partial<AppearancePreferences>) => void;
  resetPreferences: () => void;
  setStyle: (style: UIStyle) => void;
  setColorMode: (mode: ColorMode) => void;
  setContrastMode: (contrast: ContrastMode) => void;
}

const AppearanceContext = createContext<AppearanceContextValue | null>(null);

function applyPreferencesToDom(
  prefs: AppearancePreferences,
  effectiveColorMode: "dark" | "light"
) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;

  root.dataset.uiStyle = prefs.uiStyle;
  root.dataset.colorMode = effectiveColorMode;
  root.dataset.contrast = prefs.contrastMode;
  root.dataset.uiFont = prefs.uiFontFamily;
  root.dataset.editorFont = prefs.editorFontFamily;
  root.dataset.lineHeight = prefs.lineHeight;
  root.dataset.reducedMotion = String(prefs.reducedMotion);

  // Sync Tailwind .dark class for Base UI primitives
  if (effectiveColorMode === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }

  // Set CSS variables for scaling and brightness
  root.style.setProperty("--ui-font-scale", `${prefs.uiFontScale}%`);
  root.style.setProperty("--app-brightness", `${prefs.brightness}%`);
}

export function AppearanceProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState<AppearancePreferences>(() =>
    appearanceRepository.getPreferences()
  );
  const [systemDark, setSystemDark] = useState<boolean>(() => {
    if (typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return true;
  });

  // 1. Subscribe to system scheme & storage events
  useEffect(() => {
    const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleSchemeChange = (e: MediaQueryListEvent) => {
      setSystemDark(e.matches);
    };

    darkQuery.addEventListener("change", handleSchemeChange);

    const handleAppearanceChange = () => {
      setPreferences(appearanceRepository.getPreferences());
    };

    window.addEventListener(APPEARANCE_CHANGE_EVENT, handleAppearanceChange);
    window.addEventListener("storage", handleAppearanceChange);

    return () => {
      darkQuery.removeEventListener("change", handleSchemeChange);
      window.removeEventListener(APPEARANCE_CHANGE_EVENT, handleAppearanceChange);
      window.removeEventListener("storage", handleAppearanceChange);
    };
  }, []);

  // 2. Compute effective color mode
  const effectiveColorMode = useMemo(() => {
    return appearanceRepository.resolveEffectiveColorMode(
      preferences.colorMode,
      systemDark
    );
  }, [preferences.colorMode, systemDark]);

  // 3. Apply changes to DOM
  useEffect(() => {
    applyPreferencesToDom(preferences, effectiveColorMode);
  }, [preferences, effectiveColorMode]);

  // 4. Update handlers
  const updatePreferences = useCallback(
    (updates: Partial<AppearancePreferences>) => {
      const updated = appearanceRepository.savePreferences(updates);
      setPreferences(updated);
    },
    []
  );

  const resetPreferences = useCallback(() => {
    const reset = appearanceRepository.resetPreferences();
    setPreferences(reset);
  }, []);

  const setStyle = useCallback(
    (uiStyle: UIStyle) => {
      updatePreferences({ uiStyle });
    },
    [updatePreferences]
  );

  const setColorMode = useCallback(
    (colorMode: ColorMode) => {
      updatePreferences({ colorMode });
    },
    [updatePreferences]
  );

  const setContrastMode = useCallback(
    (contrastMode: ContrastMode) => {
      updatePreferences({ contrastMode });
    },
    [updatePreferences]
  );

  const contextValue = useMemo<AppearanceContextValue>(
    () => ({
      preferences,
      effectiveColorMode,
      updatePreferences,
      resetPreferences,
      setStyle,
      setColorMode,
      setContrastMode,
    }),
    [
      preferences,
      effectiveColorMode,
      updatePreferences,
      resetPreferences,
      setStyle,
      setColorMode,
      setContrastMode,
    ]
  );

  return (
    <AppearanceContext.Provider value={contextValue}>
      {children}
    </AppearanceContext.Provider>
  );
}

export function useAppearance(): AppearanceContextValue {
  const context = useContext(AppearanceContext);
  if (!context) {
    throw new Error("useAppearance must be used within an AppearanceProvider");
  }
  return context;
}
