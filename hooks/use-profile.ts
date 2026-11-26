"use client";

import { createContext, createElement, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { LocalProfile, ProfileInput } from "@/types/profile";
import { draftRepository } from "@/lib/storage/draft-repository";
import { profileRepository, ProfileRepositoryError } from "@/lib/storage/profile-repository";
import { setClientCacheScope } from "@/lib/client/swr-cache";

const PROFILE_CHANGE_EVENT = "exeku:profile-changed";
/** Hides the local cached profile while signed out of Clerk without deleting saved drafts. */
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

const ProfileContext = createContext<UseProfileReturn | null>(null);

function useProfileState(active: boolean): UseProfileReturn {
  const [profile, setProfile] = useState<LocalProfile | null>(null);
  const [signedOut, setSignedOut] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(active);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const loadRequestRef = useRef(0);

  const loadProfile = useCallback(async () => {
    const requestId = ++loadRequestRef.current;
    try {
      const activeProfile = await profileRepository.getActiveProfile();
      if (!mountedRef.current || loadRequestRef.current !== requestId) return;
      const isSignedOut = readSignedOut();
      setProfile(activeProfile);
      setSignedOut(isSignedOut);
      setClientCacheScope(isSignedOut || !activeProfile ? null : (activeProfile.ownerId ?? activeProfile.id));
      setError(null);
    } catch (err) {
      if (!mountedRef.current || loadRequestRef.current !== requestId) return;
      const message =
        err instanceof ProfileRepositoryError || err instanceof Error
          ? err.message
          : "Failed to load local profile";
      setError(message);
      setProfile(null);
      setClientCacheScope(null);
    } finally {
      if (mountedRef.current && loadRequestRef.current === requestId) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!active) return;
    mountedRef.current = true;
    queueMicrotask(() => {
      if (mountedRef.current) void loadProfile();
    });

    const handleProfileChange = () => {
      void loadProfile();
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === SIGNED_OUT_KEY) {
        void loadProfile();
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener(PROFILE_CHANGE_EVENT, handleProfileChange);
      window.addEventListener("storage", handleStorage);
    }

    return () => {
      mountedRef.current = false;
      if (typeof window !== "undefined") {
        window.removeEventListener(PROFILE_CHANGE_EVENT, handleProfileChange);
        window.removeEventListener("storage", handleStorage);
      }
    };
  }, [active, loadProfile]);

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
        setClientCacheScope(created.ownerId ?? created.id);
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
        await draftRepository.deleteProfileDrafts(id);
        await profileRepository.deleteProfile(id);
        setProfile(null);
        setClientCacheScope(null);
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
    if (nextSignedOut) setClientCacheScope(null);
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

/** Shares one IndexedDB profile load across the entire app shell so tab switches never re-read IDB or flash skeletons. */
export function ProfileProvider({ children }: { children: ReactNode }) {
  const state = useProfileState(true);
  return createElement(ProfileContext.Provider, { value: state }, children);
}

export function useProfile(): UseProfileReturn {
  const shared = useContext(ProfileContext);
  const standalone = useProfileState(shared === null);
  return shared ?? standalone;
}
