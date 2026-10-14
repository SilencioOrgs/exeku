import {
  type AppearancePreferences,
  type ColorMode,
  DEFAULT_APPEARANCE_PREFERENCES,
  normalizeAppearancePreferences,
} from "@/types/appearance";

export const APPEARANCE_STORAGE_KEY = "exeku_appearance_settings";
export const APPEARANCE_CHANGE_EVENT = "exeku:appearance-changed";

export interface IKeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface AppearanceRepositoryOptions {
  storage?: IKeyValueStorage | null;
}

export class AppearanceRepository {
  private readonly storage: IKeyValueStorage | null;
  private memoryCache: AppearancePreferences = { ...DEFAULT_APPEARANCE_PREFERENCES };

  constructor(options?: AppearanceRepositoryOptions) {
    if (options && options.storage !== undefined) {
      this.storage = options.storage;
    } else if (typeof window !== "undefined" && window.localStorage) {
      this.storage = window.localStorage;
    } else {
      this.storage = null;
    }

    // Initialize memory cache
    this.memoryCache = this.readFromStorage();
  }

  private readFromStorage(): AppearancePreferences {
    if (!this.storage) {
      return { ...this.memoryCache };
    }

    try {
      const raw = this.storage.getItem(APPEARANCE_STORAGE_KEY);
      if (!raw) {
        return { ...DEFAULT_APPEARANCE_PREFERENCES };
      }
      const parsed = JSON.parse(raw);
      return normalizeAppearancePreferences(parsed);
    } catch {
      return { ...DEFAULT_APPEARANCE_PREFERENCES };
    }
  }

  private notifyChange(): void {
    if (typeof window !== "undefined") {
      try {
        window.dispatchEvent(new CustomEvent(APPEARANCE_CHANGE_EVENT));
      } catch {
        // Ignore in non-DOM test environments
      }
    }
  }

  /**
   * Retrieves current appearance preferences (from storage or memory fallback).
   */
  getPreferences(): AppearancePreferences {
    this.memoryCache = this.readFromStorage();
    return { ...this.memoryCache };
  }

  /**
   * Updates and saves partial appearance preferences.
   */
  savePreferences(updates: Partial<AppearancePreferences>): AppearancePreferences {
    const current = this.getPreferences();
    const merged = normalizeAppearancePreferences({
      ...current,
      ...updates,
    });

    this.memoryCache = merged;

    if (this.storage) {
      try {
        this.storage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(merged));
      } catch {
        // If storage write fails, memoryCache still holds the active settings
      }
    }

    this.notifyChange();
    return { ...merged };
  }

  /**
   * Resets all appearance preferences back to defaults.
   */
  resetPreferences(): AppearancePreferences {
    this.memoryCache = { ...DEFAULT_APPEARANCE_PREFERENCES };

    if (this.storage) {
      try {
        this.storage.removeItem(APPEARANCE_STORAGE_KEY);
      } catch {
        // Safe fallback
      }
    }

    this.notifyChange();
    return { ...DEFAULT_APPEARANCE_PREFERENCES };
  }

  /**
   * Resolves effective color mode ("dark" or "light") given the configured mode
   * and the system's preferred color scheme.
   */
  resolveEffectiveColorMode(
    colorMode: ColorMode,
    systemPrefersDark: boolean
  ): "dark" | "light" {
    if (colorMode === "system") {
      return systemPrefersDark ? "dark" : "light";
    }
    return colorMode;
  }
}

export const appearanceRepository = new AppearanceRepository();
