"use client";

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
        <div className="w-10 h-10 border-4 border-[#00F0FF] border-t-transparent animate-spin mb-4" />
        <span className="font-mono text-xs text-[#00F0FF] uppercase tracking-widest animate-pulse">
          READING SETTINGS CONFIGURATION...
        </span>
      </div>
    );
  }

  const levelNum =
    profile.experienceLevel === "beginner"
      ? "01"
      : profile.experienceLevel === "intermediate"
      ? "02"
      : "03";

  const levelBadgeVariant =
    profile.experienceLevel === "beginner"
      ? "mint"
      : profile.experienceLevel === "intermediate"
      ? "cyan"
      : "pink";

  const createdDate = new Date(profile.createdAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-[#2E1A57] pb-4">
        <div>
          <h1 className="font-pixel text-2xl text-white tracking-wide">
            PROFILE &amp; STORAGE SETTINGS_
          </h1>
          <p className="text-xs text-[#A79EC4] mt-0.5">
            Manage local coder identity, inspect IndexedDB health, or reset device state.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PixelBadge variant="purple" bracketed>
            LOCAL PARTITION: exeku_local_v1
          </PixelBadge>
        </div>
      </div>

      {/* Profile Identity Card */}
      <PixelCard
        variant="elevated"
        className="p-5 sm:p-6 border-2 border-[#3D2275] bg-[#120A24] space-y-4"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-4">
            <PixelAvatar
              avatarId={profile.avatarId}
              size={56}
              className="border-2 border-[#00F0FF] shadow-[2px_2px_0px_#000000] shrink-0"
            />
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-pixel text-xl text-white">
                  {profile.displayName.toUpperCase()}_
                </span>
                <PixelBadge variant={levelBadgeVariant} bracketed>
                  LVL {levelNum}: {profile.experienceLevel.toUpperCase()}
                </PixelBadge>
              </div>
              {profile.bio ? (
                <p className="text-xs text-[#A79EC4] max-w-lg">
                  &ldquo;{profile.bio}&rdquo;
                </p>
              ) : (
                <p className="text-xs text-[#7A6E9B] font-mono">
                  No local bio set &bull; Initialized {createdDate}
                </p>
              )}
            </div>
          </div>

          <PixelButton
            variant="cyan"
            size="sm"
            onClick={() => setIsEditOpen(true)}
            className="w-full sm:w-auto"
          >
            EDIT PROFILE ✎
          </PixelButton>
        </div>

        {/* Profile Properties Details */}
        <div className="pt-3 border-t border-[#2E1A57] grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
          <div className="p-2.5 bg-[#090514] border border-[#2E1A57] space-y-1">
            <span className="text-[#7A6E9B] text-[10px] uppercase">Preferred Track</span>
            <div className="flex items-center gap-2 text-white">
              <DotIcon
                name={LANGUAGE_ICONS[profile.preferredLanguage]}
                size={14}
                color="#00F0FF"
              />
              <span>{LANGUAGE_DISPLAY_NAMES[profile.preferredLanguage]}</span>
            </div>
          </div>

          <div className="p-2.5 bg-[#090514] border border-[#2E1A57] space-y-1">
            <span className="text-[#7A6E9B] text-[10px] uppercase">Experience Level</span>
            <div className="text-[#00FF9D] uppercase">
              {profile.experienceLevel}
            </div>
          </div>

          <div className="p-2.5 bg-[#090514] border border-[#2E1A57] space-y-1">
            <span className="text-[#7A6E9B] text-[10px] uppercase">Profile UUID</span>
            <div className="text-[#A79EC4] truncate" title={profile.id}>
              {profile.id}
            </div>
          </div>
        </div>
      </PixelCard>

      {/* Storage Health & Locality Panel */}
      <PixelCard variant="default" className="p-5 sm:p-6 border-2 border-[#2E1A57] space-y-4">
        <div className="flex items-center justify-between border-b border-[#2E1A57] pb-3">
          <div>
            <h2 className="font-pixel text-base text-white">
              INDEXEDDB STORAGE TELEMETRY_
            </h2>
            <p className="text-xs text-[#7A6E9B]">
              Real inspection of client storage schemas and data isolation.
            </p>
          </div>
          <span className="flex items-center gap-1.5 font-mono text-[10px] text-[#00FF9D]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00FF9D] animate-pulse" />
            100% LOCAL
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-mono text-xs">
          <div className="p-3 bg-[#090514] border border-[#2E1A57] space-y-1">
            <span className="text-[#7A6E9B] text-[10px] uppercase">Database Target</span>
            <div className="text-white font-bold">exeku_local_v1</div>
            <span className="text-[#00FF9D] text-[10px]">Version 2 (Active)</span>
          </div>

          <div className="p-3 bg-[#090514] border border-[#2E1A57] space-y-1">
            <span className="text-[#7A6E9B] text-[10px] uppercase">Profile Store</span>
            <div className="text-white font-bold">profiles</div>
            <span className="text-[#A79EC4] text-[10px]">1 record mounted</span>
          </div>

          <div className="p-3 bg-[#090514] border border-[#2E1A57] space-y-1">
            <span className="text-[#7A6E9B] text-[10px] uppercase">Drafts Store</span>
            <div className="text-white font-bold">drafts</div>
            <span className="text-[#00F0FF] text-[10px]">
              {draftsCount} language buffer{draftsCount === 1 ? "" : "s"}
            </span>
          </div>

          <div className="p-3 bg-[#090514] border border-[#2E1A57] space-y-1">
            <span className="text-[#7A6E9B] text-[10px] uppercase">Telemetry Transmitted</span>
            <div className="text-[#00FF9D] font-bold">0 BYTES</div>
            <span className="text-[#7A6E9B] text-[10px]">Air-gapped safe</span>
          </div>
        </div>

        {/* Privacy Assurance Notice */}
        <div className="p-3.5 bg-[#090514]/60 border border-[#2E1A57] text-xs text-[#A79EC4] leading-relaxed">
          <strong>Privacy Assurance:</strong> Exeku is strictly offline-first. Your profile, settings,
          and code buffers are stored exclusively in your browser&apos;s IndexedDB partition on this
          hardware. No remote servers, analytical tracking, or third-party cookies are used.
        </div>
      </PixelCard>

      {/* Danger Zone: Machine Reset */}
      <PixelCard
        variant="elevated"
        className="p-5 sm:p-6 border-2 border-[#FF007A]/60 bg-[#120A24] space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#FF007A]/40 pb-3">
          <div>
            <h2 className="font-pixel text-base text-[#FF007A]">
              DANGER ZONE: MACHINE RESET_
            </h2>
            <p className="text-xs text-[#A79EC4]">
              Permanently wipe profile records and workspace buffers from this computer.
            </p>
          </div>
          <PixelBadge variant="pink" bracketed>
            DESTRUCTIVE
          </PixelBadge>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-xs text-[#A79EC4] max-w-xl leading-relaxed">
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
            RESET LOCAL PROFILE ✖
          </PixelButton>
        </div>
      </PixelCard>

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
