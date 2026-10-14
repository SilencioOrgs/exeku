import { appearanceRepository } from "./appearance-repository";
import { normalizeAppearancePreferences, type AppearancePreferences } from "@/types/appearance";
import type { LocalProfile, ProfileInput } from "@/types/profile";
import { validateDisplayName } from "@/lib/profile-validation";
import {
  PROFILE_STORE,
  idbGet,
  idbGetAll,
  idbPut,
  idbUpdate,
  idbDelete,
  idbClear,
} from "./db";

export class ProfileRepositoryError extends Error {
  cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "ProfileRepositoryError";
    this.cause = cause;
  }
}

function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback for older test environments
  return "usr_" + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
}

export class ProfileRepository {
  /**
   * Retrieves the current active profile, or null if no profile exists.
   */
  async getActiveProfile(): Promise<LocalProfile | null> {
    try {
      const profiles = await idbGetAll<LocalProfile>(PROFILE_STORE);
      if (!profiles || profiles.length === 0) {
        return null;
      }
      // Return the most recently updated profile if multiple exist in store
      profiles.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      return profiles[0];
    } catch (err) {
      throw new ProfileRepositoryError("Failed to retrieve active profile", err);
    }
  }

  /**
   * Checks whether a profile exists locally without loading the entire payload.
   */
  async hasProfile(): Promise<boolean> {
    const profile = await this.getActiveProfile();
    return profile !== null;
  }

  /**
   * Creates and stores a new local profile.
   */
  async saveProfile(input: ProfileInput): Promise<LocalProfile> {
    const validation = validateDisplayName(input.displayName);
    if (!validation.isValid) {
      throw new ProfileRepositoryError(
        validation.error || "Invalid display name provided"
      );
    }

    const now = new Date().toISOString();
    const profile: LocalProfile = {
      id: generateId(),
      displayName: validation.trimmed!,
      bio: input.bio?.trim() || undefined,
      avatarId: input.avatarId,
      experienceLevel: input.experienceLevel,
      preferredLanguage: input.preferredLanguage,
      appearancePreferences: appearanceRepository.getPreferences(),
      createdAt: now,
      updatedAt: now,
    };

    try {
      await idbPut<LocalProfile>(PROFILE_STORE, profile);
      return profile;
    } catch (err) {
      throw new ProfileRepositoryError("Failed to save profile to local storage", err);
    }
  }

  /**
   * Updates an existing profile's fields.
   */
  async updateProfile(
    id: string,
    updates: Partial<ProfileInput>
  ): Promise<LocalProfile> {
    const existing = await idbGet<LocalProfile>(PROFILE_STORE, id);
    if (!existing) {
      throw new ProfileRepositoryError(`Profile with ID '${id}' was not found`);
    }

    let trimmedDisplayName = existing.displayName;
    if (updates.displayName !== undefined) {
      const validation = validateDisplayName(updates.displayName);
      if (!validation.isValid) {
        throw new ProfileRepositoryError(
          validation.error || "Invalid display name provided"
        );
      }
      trimmedDisplayName = validation.trimmed!;
    }

    const updatedProfile: LocalProfile = {
      ...existing,
      displayName: trimmedDisplayName,
      bio:
        updates.bio !== undefined
          ? updates.bio.trim() || undefined
          : existing.bio,
      avatarId: updates.avatarId ?? existing.avatarId,
      experienceLevel: updates.experienceLevel ?? existing.experienceLevel,
      preferredLanguage:
        updates.preferredLanguage ?? existing.preferredLanguage,
      updatedAt: new Date().toISOString(),
    };

    try {
      return await idbUpdate<LocalProfile>(PROFILE_STORE, id, (current) => {
        if (!current) throw new Error("Profile was not found");
        return { ...updatedProfile, appearancePreferences: current.appearancePreferences };
      });
    } catch (err) {
      throw new ProfileRepositoryError(
        `Failed to update profile '${id}' in local storage`,
        err
      );
    }
  }

  async saveAppearancePreferences(id: string, preferences: AppearancePreferences): Promise<void> {
    try {
      await idbUpdate<LocalProfile>(PROFILE_STORE, id, (existing) => {
        if (!existing) throw new Error("Profile was not found");
        // Appearance must not alter profile identity, timestamps, or unrelated fields.
        return { ...existing, appearancePreferences: normalizeAppearancePreferences(preferences) };
      });
    } catch (error) {
      throw new ProfileRepositoryError("Failed to save profile appearance", error);
    }
  }

  /**
   * Deletes a profile by ID.
   */
  async deleteProfile(id: string): Promise<void> {
    try {
      await idbDelete(PROFILE_STORE, id);
    } catch (err) {
      throw new ProfileRepositoryError(
        `Failed to delete profile '${id}' from local storage`,
        err
      );
    }
  }

  /**
   * Clears all profiles from local storage.
   */
  async clearAll(): Promise<void> {
    try {
      await idbClear(PROFILE_STORE);
    } catch (err) {
      throw new ProfileRepositoryError(
        "Failed to clear profile database",
        err
      );
    }
  }
}

export const profileRepository = new ProfileRepository();
