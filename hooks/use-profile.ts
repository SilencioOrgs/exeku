"use client";

import { useState, useEffect, useCallback } from "react";
import type { LocalProfile, ProfileInput } from "@/types/profile";
import { profileRepository, ProfileRepositoryError } from "@/lib/storage/profile-repository";

const PROFILE_CHANGE_EVENT = "exeku:profile-changed";
// shortcut: logout is a browser flag that keeps the local profile and drafts, replace with a real session sign-out when Supabase lands.
const SIGNED_OUT_KEY = "exeku:signed-out";

function readSignedOut(): boolean {
  try { return localStorage.getItem(SIGNED_OUT_KEY) === "true"; }
  catch { return false; }
}

export interface UseProfileReturn {
  /** The signed-in profile: null after logout, even though the data stays saved. */
  profile: LocalProfile | null;
  signOut: () => void;
  resumeSession: () => void;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  saveProfile: (input: ProfileInput) => Promise<LocalProfile>;
  updateProfile: (id: string, updates: Partial<ProfileInput>) => Promise<LocalProfile>;
  resetProfile: (id: string) => Promise<void>;
  reload: () => Promise<void>;
  clearError: () => void;
}

export function useProfile(): UseProfileReturn {
  const [profile, setProfile] = useState<LocalProfile | null>(null);
  const [signedOut, setSignedOut] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    try {
      const active = await profileRepository.getActiveProfile();
      setProfile(active);
      setSignedOut(readSignedOut());
      setError(null);
    } catch (err) {
      const message =
        err instanceof ProfileRepositoryError || err instanceof Error
          ? err.message
          : "Failed to load local profile";
      setError(message);
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;

    async function init() {
      try {
        const active = await profileRepository.getActiveProfile();
        if (!ignore) {
          setProfile(active);
          setSignedOut(readSignedOut());
          setError(null);
        }
      } catch (err) {
        if (!ignore) {
          const message =
            err instanceof ProfileRepositoryError || err instanceof Error
              ? err.message
              : "Failed to load local profile";
          setError(message);
          setProfile(null);
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    init();

    const handleProfileChange = () => {
      loadProfile();
    };

    if (typeof window !== "undefined") {
      window.addEventListener(PROFILE_CHANGE_EVENT, handleProfileChange);
      window.addEventListener("storage", handleProfileChange);
    }

    return () => {
      ignore = true;
      if (typeof window !== "undefined") {
        window.removeEventListener(PROFILE_CHANGE_EVENT, handleProfileChange);
        window.removeEventListener("storage", handleProfileChange);
      }
    };
  }, [loadProfile]);

  const notifyChange = useCallback(() => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(PROFILE_CHANGE_EVENT));
    }
  }, []);

  const saveProfile = useCallback(
    async (input: ProfileInput): Promise<LocalProfile> => {
      setIsSaving(true);
      setError(null);
      try {
        const created = await profileRepository.saveProfile(input);
        setProfile(created);
        notifyChange();
        return created;
      } catch (err) {
        const message =
          err instanceof ProfileRepositoryError || err instanceof Error
            ? err.message
            : "Failed to create profile";
        setError(message);
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [notifyChange]
  );

  const updateProfile = useCallback(
    async (id: string, updates: Partial<ProfileInput>): Promise<LocalProfile> => {
      setIsSaving(true);
      setError(null);
      try {
        const updated = await profileRepository.updateProfile(id, updates);
        setProfile(updated);
        notifyChange();
        return updated;
      } catch (err) {
        const message =
          err instanceof ProfileRepositoryError || err instanceof Error
            ? err.message
            : "Failed to update profile";
        setError(message);
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [notifyChange]
  );

  const resetProfile = useCallback(
    async (id: string): Promise<void> => {
      setIsSaving(true);
      setError(null);
      try {
        await profileRepository.deleteProfile(id);
        setProfile(null);
        notifyChange();
      } catch (err) {
        const message =
          err instanceof ProfileRepositoryError || err instanceof Error
            ? err.message
            : "Failed to reset profile";
        setError(message);
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [notifyChange]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const setSession = useCallback((nextSignedOut: boolean) => {
    try {
      if (nextSignedOut) localStorage.setItem(SIGNED_OUT_KEY, "true");
      else localStorage.removeItem(SIGNED_OUT_KEY);
    } catch { /* Logout still applies to this page when browser storage is denied. */ }
    setSignedOut(nextSignedOut);
    notifyChange();
  }, [notifyChange]);

  const signOut = useCallback(() => setSession(true), [setSession]);
  const resumeSession = useCallback(() => setSession(false), [setSession]);

  return {
    profile: signedOut ? null : profile,
    signOut,
    resumeSession,
    isLoading,
    isSaving,
    error,
    saveProfile,
    updateProfile,
    resetProfile,
    reload: loadProfile,
    clearError,
  };
}
