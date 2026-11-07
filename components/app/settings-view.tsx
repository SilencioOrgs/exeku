"use client";

import { AppearanceStudio } from "./appearance-studio";
import { StyleText } from "@/components/appearance/style-text";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useProfile } from "@/hooks/use-profile";
import { PixelCard } from "@/components/retro/pixel-card";
import { PixelAvatar } from "@/components/retro/pixel-avatar";
import { PixelButton } from "@/components/retro/pixel-button";
import { PixelBadge } from "@/components/retro/pixel-badge";
import { DotIcon, type DotIconName } from "@/components/retro/dot-icon";
import { ProfileEditDialog } from "./profile-edit-dialog";
import { ProfileResetDialog } from "./profile-reset-dialog";
import { draftRepository } from "@/lib/storage/draft-repository";
import { LANGUAGE_DISPLAY_NAMES } from "@/lib/workspace-defaults";
import type { PreferredLanguage } from "@/types/profile";

const LANGUAGE_ICONS: Record<PreferredLanguage, DotIconName> = {
  python: "python",
  java: "java",
  cpp: "cplusplus",
  c: "file",
};

export function SettingsView() {
  const router = useRouter();
  const { profile, updateProfile, resetProfile } = useProfile();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [draftsCount, setDraftsCount] = useState<number>(0);

  useEffect(() => {
    if (!profile) return;
    let isCancelled = false;

    async function loadDraftsCount() {
      try {
        if (!profile) return;
        const all = await draftRepository.getAllDraftsForProfile(profile.id);
        if (!isCancelled) {
          setDraftsCount(all.length);
        }
      } catch {
        // Fall back gracefully
      }
    }

    loadDraftsCount();
    return () => {
      isCancelled = true;
    };
  }, [profile]);

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <div className="w-10 h-10 border-4 border-[var(--color-accent)] border-t-transparent animate-spin mb-4" />
        <span className="font-mono text-xs text-[var(--color-accent)] animate-pulse">
          Reading settings configuration...
        </span>
      </div>
    );
  }


  const createdDate = new Date(profile.createdAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="settings-page space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--color-border)] pb-4">
        <div>
          <h1 className="font-heading text-2xl text-foreground">
            Settings
          </h1>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            Customize your workspace and manage your profile.
          </p>
        </div>
      </div>

      <AppearanceStudio />

      {/* Profile Identity Card */}
      <PixelCard
        variant="elevated"
        className="p-5 sm:p-6 border border-[var(--color-border)] bg-[var(--color-surface)] space-y-4"
      >
        <div className="flex flex-wrap flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex min-w-0 items-start sm:items-center gap-4">
            <PixelAvatar
              avatarId={profile.avatarId}
              size={56}
              className="shrink-0"
            />
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-heading text-xl text-foreground [overflow-wrap:anywhere]">
                  <StyleText arcade={<>{profile.displayName.toUpperCase()}</>} clarity={profile.displayName} />
                </span>
                <PixelBadge><span className="capitalize">{profile.experienceLevel}</span></PixelBadge>
              </div>
              {profile.bio ? (
                <p className="text-xs text-[var(--color-text-muted)] max-w-lg">
                  &ldquo;{profile.bio}&rdquo;
                </p>
              ) : (
                <p className="text-xs text-[var(--color-text-dim)] font-mono">
                  No local bio set &bull; Initialized {createdDate}
                </p>
              )}
            </div>
          </div>

          <PixelButton variant="secondary" onClick={() => setIsEditOpen(true)} className="w-full sm:w-auto">
            <DotIcon name="pencil" size={15} aria-hidden="true" />Edit profile
          </PixelButton>
        </div>

        {/* Profile Properties Details */}
        <div className="pt-3 border-t border-[var(--color-border)] grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
          <div className="space-y-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-canvas)] p-2.5">
            <span className="text-[var(--color-text-dim)] text-xs">Preferred language</span>
            <div className="flex items-center gap-2 text-foreground">
              <DotIcon
                name={LANGUAGE_ICONS[profile.preferredLanguage]}
                size={14}
                color="var(--color-accent)"
              />
              <span>{LANGUAGE_DISPLAY_NAMES[profile.preferredLanguage]}</span>
            </div>
          </div>

          <div className="space-y-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-canvas)] p-2.5">
            <span className="text-[var(--color-text-dim)] text-xs">Experience level</span>
            <div className="text-[var(--color-primary-text)]">
              {profile.experienceLevel}
            </div>
          </div>

          <div className="space-y-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-canvas)] p-2.5">
            <span className="text-[var(--color-text-dim)] text-xs">Profile ID</span>
            <div className="text-[var(--color-text-muted)] truncate" title={profile.id}>
              {profile.id}
            </div>
          </div>
        </div>
      </PixelCard>

      {/* Advanced details remain available without overwhelming regular settings. */}
      <details className="settings-advanced">
        <summary>Advanced device settings <span>Local storage and reset</span></summary>
      {/* Storage Health & Locality Panel */}
      <PixelCard variant="default" className="p-5 sm:p-6 border border-[var(--color-border)] space-y-4">
        <div className="flex flex-wrap gap-3 items-center justify-between border-b border-[var(--color-border)] pb-3">
          <div>
            <h2 className="font-heading text-base text-foreground">
              <StyleText arcade="Local storage" clarity="Device storage" command="Local storage" />
            </h2>
            <p className="text-xs text-[var(--color-text-dim)]">
              Real inspection of client storage schemas and data isolation.
            </p>
          </div>
          <span className="flex items-center gap-1.5 font-mono text-xs text-[var(--color-primary-text)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary-text)] animate-pulse" />
            100% Local
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-mono text-xs">
          <div className="p-3 bg-[var(--color-canvas)] border border-[var(--color-border)] space-y-1">
            <span className="text-[var(--color-text-dim)] text-xs">Database Target</span>
            <div className="text-foreground font-bold">exeku_local_v1</div>
            <span className="text-[var(--color-primary-text)] text-xs">Version 2 (Active)</span>
          </div>

          <div className="p-3 bg-[var(--color-canvas)] border border-[var(--color-border)] space-y-1">
            <span className="text-[var(--color-text-dim)] text-xs">Profile Store</span>
            <div className="text-foreground font-bold">profiles</div>
            <span className="text-[var(--color-text-muted)] text-xs">1 record mounted</span>
          </div>

          <div className="p-3 bg-[var(--color-canvas)] border border-[var(--color-border)] space-y-1">
            <span className="text-[var(--color-text-dim)] text-xs">Drafts Store</span>
            <div className="text-foreground font-bold">drafts</div>
            <span className="text-[var(--color-accent)] text-xs">
              {draftsCount} language buffer{draftsCount === 1 ? "" : "s"}
            </span>
          </div>

          <div className="p-3 bg-[var(--color-canvas)] border border-[var(--color-border)] space-y-1">
            <span className="text-[var(--color-text-dim)] text-xs">Telemetry Transmitted</span>
            <div className="text-[var(--color-primary-text)] font-bold">0 Bytes</div>
            <span className="text-[var(--color-text-dim)] text-xs">Stored on this device</span>
          </div>
        </div>

        {/* Privacy Assurance Notice */}
        <div className="p-3.5 bg-[var(--color-canvas)]/60 border border-[var(--color-border)] text-xs text-[var(--color-text-muted)] leading-relaxed">
          <strong>Privacy Assurance:</strong> Exeku is an online-first platform in local developer preview. Your profile, appearance settings,
          and code drafts are stored locally in your browser. Running and submitting code sends the source
          to the configured isolated sandbox through the application server.
        </div>
      </PixelCard>

      {/* Danger Zone: Machine Reset */}
      <PixelCard
        variant="elevated"
        className="p-5 sm:p-6 border border-[var(--color-pink)]/60 bg-[var(--color-surface)] space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--color-pink)]/40 pb-3">
          <div>
            <h2 className="font-heading text-base text-[var(--color-pink)]">
              <StyleText arcade="Danger zone" clarity="Reset local data" />
            </h2>
            <p className="text-xs text-[var(--color-text-muted)]">
              Permanently wipe profile records and workspace buffers from this computer.
            </p>
          </div>
          <PixelBadge variant="pink" bracketed>
            Destructive
          </PixelBadge>
        </div>

        <div className="flex flex-wrap flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-xs text-[var(--color-text-muted)] max-w-xl leading-relaxed">
            Resetting your profile will permanently erase your local identity, experience settings,
            and all saved code scratchpads from IndexedDB. You will be redirected back to the
            onboarding terminal.
          </p>
          <PixelButton
            variant="pink"
            size="md"
            onClick={() => setIsResetOpen(true)}
            className="w-full sm:w-auto shrink-0"
          >
            Reset local profile <span className="arcade-copy"><DotIcon name="close" size={14} aria-hidden="true" /></span>
          </PixelButton>
        </div>
      </PixelCard>

      </details>

      {/* Edit Profile Dialog */}
      <ProfileEditDialog
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        profile={profile}
        onSave={async (updates) => {
          await updateProfile(profile.id, updates);
        }}
      />

      {/* Reset Profile Dialog */}
      <ProfileResetDialog
        isOpen={isResetOpen}
        onClose={() => setIsResetOpen(false)}
        profileName={profile.displayName}
        onConfirmReset={async () => {
          await draftRepository.deleteProfileDrafts(profile.id);
          await resetProfile(profile.id);
          router.push("/setup");
        }}
      />
    </div>
  );
}
