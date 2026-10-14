import {
  type AppearancePreferences,
  type ColorMode,
  DEFAULT_APPEARANCE_PREFERENCES,
  normalizeAppearancePreferences,
} from "@/types/appearance";

export const APPEARANCE_STORAGE_KEY = "exeku_appearance_settings";
export const APPEARANCE_SNAPSHOT_KEY = "exeku_appearance_snapshot";
export const APPEARANCE_CHANGE_EVENT = "exeku:appearance-changed";
export type PersistenceStatus = "loading" | "saved" | "session" | "saving" | "error";

export interface IKeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface AppearanceRepositoryOptions {
  storage?: IKeyValueStorage | null;
}

export function getAppearanceStorage(): IKeyValueStorage | null {
  try { return typeof window === "undefined" ? null : window.localStorage; }
  catch { return null; }
}

// Snapshot is a first-paint cache only. Profile records and guest settings remain authoritative.
export function cacheAppearanceSnapshot(preferences: AppearancePreferences): void {
  try { getAppearanceStorage()?.setItem(APPEARANCE_SNAPSHOT_KEY, JSON.stringify(preferences)); }
  catch { /* A cache failure does not change whether canonical preferences were saved. */ }
}

export class AppearanceRepository {
  private readonly storage: IKeyValueStorage | null;
  private memoryCache: AppearancePreferences = { ...DEFAULT_APPEARANCE_PREFERENCES };
  private unsaved = false;
  persistenceStatus: PersistenceStatus;

  constructor(options?: AppearanceRepositoryOptions) {
    this.storage = options?.storage !== undefined ? options.storage : getAppearanceStorage();
    this.persistenceStatus = this.storage ? "saved" : "session";
    // Initialize memory cache
    this.memoryCache = this.readFromStorage();
  }

  private readFromStorage(): AppearancePreferences {
    if (!this.storage || this.unsaved) return { ...this.memoryCache };
    try {
      const raw = this.storage.getItem(APPEARANCE_STORAGE_KEY);
      return normalizeAppearancePreferences(raw ? JSON.parse(raw) : null);
    } catch {
      this.persistenceStatus = "error";
      return { ...this.memoryCache };
    }
  }

  private notifyChange(): void {
    if (typeof window !== "undefined") {
      try { window.dispatchEvent(new CustomEvent(APPEARANCE_CHANGE_EVENT)); }
      catch { /* Ignore in non-DOM test environments */ }
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
    this.memoryCache = normalizeAppearancePreferences({ ...this.getPreferences(), ...updates });
    if (this.storage) {
      try {
        this.storage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(this.memoryCache));
        this.unsaved = false;
        this.persistenceStatus = "saved";
      } catch {
        // If storage write fails, memoryCache still holds the active settings
        this.unsaved = true;
        this.persistenceStatus = "error";
      }
    }
    this.notifyChange();
    return { ...this.memoryCache };
  }

  /**
   * Resets all appearance preferences back to defaults.
   */
  resetPreferences(): AppearancePreferences {
    // Persist defaults explicitly so a failed removal cannot restore stale preferences.
    return this.savePreferences(DEFAULT_APPEARANCE_PREFERENCES);
  }

  /**
   * Resolves effective color mode ("dark" or "light") given the configured mode
   * and the system's preferred color scheme.
   */
  resolveEffectiveColorMode(colorMode: ColorMode, systemPrefersDark: boolean): "dark" | "light" {
    return colorMode === "system" ? (systemPrefersDark ? "dark" : "light") : colorMode;
  }
}

export const appearanceRepository = new AppearanceRepository();
