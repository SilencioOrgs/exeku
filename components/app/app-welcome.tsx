"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useProfile } from "@/hooks/use-profile";
import { getAvatar } from "@/lib/avatars";
import { PixelAvatar } from "@/components/retro/pixel-avatar";
import { PixelCard } from "@/components/retro/pixel-card";
import { PixelButton } from "@/components/retro/pixel-button";
import { PixelBadge } from "@/components/retro/pixel-badge";
import { DotIcon, type DotIconName } from "@/components/retro/dot-icon";
import { ProfileEditDialog } from "./profile-edit-dialog";
import { ProfileResetDialog } from "./profile-reset-dialog";

const LANGUAGE_LABELS: Record<string, { label: string; icon: DotIconName; accent: string }> = {
  python: { label: "Python 3", icon: "python", accent: "#00F0FF" },
  java: { label: "Java", icon: "java", accent: "#FF007A" },
  cpp: { label: "C++", icon: "cplusplus", accent: "#9E00FF" },
  c: { label: "C", icon: "file", accent: "#00FF9D" },
};

export function AppWelcome() {
  const router = useRouter();
  const { profile, isLoading, updateProfile, resetProfile } = useProfile();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !profile) {
      router.replace("/setup");
    }
  }, [isLoading, profile, router]);

  if (isLoading || !profile) {
    return (
      <div className="min-h-screen bg-[#090514] flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#00F0FF] border-t-transparent animate-spin" />
          <span className="font-mono text-xs text-[#00F0FF] uppercase tracking-widest animate-pulse">
            LOADING LOCAL PROFILE...
          </span>
        </div>
      </div>
    );
  }

  const avatarMeta = getAvatar(profile.avatarId);
  const langMeta = LANGUAGE_LABELS[profile.preferredLanguage] ?? LANGUAGE_LABELS.python;
  const createdDate = new Date(profile.createdAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-[#090514] text-white flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background Pixel Grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage:
            "linear-gradient(to right, #2E1A57 1px, transparent 1px), linear-gradient(to bottom, #2E1A57 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      <div className="w-full max-w-3xl relative z-10 space-y-6">
        {/* Top App Bar */}
        <header className="flex items-center justify-between border-b-2 border-[#2E1A57] pb-4">
          <Link
            href="/"
            className="flex items-center gap-2.5 text-white hover:text-[#00F0FF] transition-colors group"
          >
            <div className="w-8 h-8 bg-[#9E00FF] border border-[#00F0FF] flex items-center justify-center font-pixel text-base font-bold shadow-[2px_2px_0px_#000000]">
              E
            </div>
            <span className="font-pixel text-xl tracking-wider text-white group-hover:text-[#00F0FF]">
              EXE<span className="text-[#00F0FF]">KU</span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <PixelBadge variant="mint" bracketed>
              OFFLINE READY
            </PixelBadge>
            <Link href="/">
              <PixelButton variant="ghost" size="sm">
                LANDING PAGE
              </PixelButton>
            </Link>
          </div>
        </header>

        {/* Profile Welcome Hero Card */}
        <PixelCard variant="elevated" className="border-2 border-[#3D2275] p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <PixelAvatar
              avatarId={profile.avatarId}
              size={72}
              className="border-2 shadow-[4px_4px_0px_#000000]"
            />

            <div className="flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-pixel text-2xl sm:text-3xl text-white tracking-wide">
                  WELCOME, {profile.displayName.toUpperCase()}_
                </span>
                <PixelBadge variant="cyan" bracketed={false} className="text-xs">
                  {avatarMeta.name}
                </PixelBadge>
              </div>

              {profile.bio ? (
                <p className="text-sm font-mono text-[#D4C3DC] pt-1">
                  &ldquo;{profile.bio}&rdquo;
                </p>
              ) : (
                <p className="text-xs font-mono text-[#7B6E94] pt-1">
                  Local profile initialized on this machine.
                </p>
              )}
            </div>

            {/* Quick Actions */}
            <div className="flex flex-row sm:flex-col gap-2 w-full sm:w-auto">
              <PixelButton
                variant="cyan"
                size="sm"
                onClick={() => setIsEditOpen(true)}
                className="flex-1 sm:flex-none"
              >
                EDIT PROFILE ✎
              </PixelButton>
              <PixelButton
                variant="ghost"
                size="sm"
                onClick={() => setIsResetOpen(true)}
                className="flex-1 sm:flex-none text-[#FF007A] hover:border-[#FF007A]"
              >
                RESET ✖
              </PixelButton>
            </div>
          </div>

          {/* Profile Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 mt-6 border-t-2 border-[#2E1A57] text-xs font-mono">
            <div className="p-3 bg-[#090514] border border-[#2E1A57]">
              <span className="text-[#6B5A8A] block uppercase text-[10px]">
                PRIMARY TARGET
              </span>
              <div className="flex items-center gap-1.5 mt-1 font-bold text-white">
                <DotIcon
                  name={langMeta.icon}
                  size={16}
                  style={{ color: langMeta.accent }}
                />
                <span style={{ color: langMeta.accent }}>{langMeta.label}</span>
              </div>
            </div>

            <div className="p-3 bg-[#090514] border border-[#2E1A57]">
              <span className="text-[#6B5A8A] block uppercase text-[10px]">
                SKILL BRACKET
              </span>
              <span className="font-bold text-[#00FF9D] mt-1 block uppercase">
                {profile.experienceLevel}
              </span>
            </div>

            <div className="p-3 bg-[#090514] border border-[#2E1A57]">
              <span className="text-[#6B5A8A] block uppercase text-[10px]">
                STORAGE LOCALITY
              </span>
              <span className="font-bold text-[#C084FC] mt-1 block truncate">
                IndexedDB (exeku_local_v1)
              </span>
            </div>

            <div className="p-3 bg-[#090514] border border-[#2E1A57]">
              <span className="text-[#6B5A8A] block uppercase text-[10px]">
                INITIALIZED ON
              </span>
              <span className="font-bold text-[#F5F3FF] mt-1 block">
                {createdDate}
              </span>
            </div>
          </div>
        </PixelCard>

        {/* Temporary Roadmap Card */}
        <PixelCard variant="default" className="border-2 border-[#2E1A57] p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[#2E1A57] pb-3">
            <div className="flex items-center gap-2">
              <DotIcon name="stars" size={18} className="text-[#00F0FF]" />
              <h3 className="font-pixel text-base sm:text-lg text-white">
                NEXT STAGES: COMING SOON_
              </h3>
            </div>
            <PixelBadge variant="purple">ROADMAP</PixelBadge>
          </div>

          <p className="text-xs sm:text-sm font-mono text-[#A79EC4] leading-relaxed">
            Your local profile and loadout preferences are securely stored on your machine.
            The Monaco coding workspace, offline compilation sandbox, and automated grading engine will be implemented in subsequent phases.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-3 bg-[#0E071D] border border-[#2E1A57] space-y-1">
              <span className="text-[10px] font-mono text-[#00F0FF] font-bold block">
                STAGE 2
              </span>
              <span className="font-mono text-xs font-bold text-white block">
                LOCAL EXECUTION
              </span>
              <p className="text-[11px] text-[#7B6E94] font-mono">
                Isolated runner for Python 3, Java, C++, and C on Windows.
              </p>
            </div>

            <div className="p-3 bg-[#0E071D] border border-[#2E1A57] space-y-1">
              <span className="text-[10px] font-mono text-[#FF007A] font-bold block">
                STAGE 3
              </span>
              <span className="font-mono text-xs font-bold text-white block">
                AUTOMATIC GRADING
              </span>
              <p className="text-[11px] text-[#7B6E94] font-mono">
                Offline unit testing, test-case verifier, and progress tracking.
              </p>
            </div>

            <div className="p-3 bg-[#0E071D] border border-[#2E1A57] space-y-1">
              <span className="text-[10px] font-mono text-[#00FF9D] font-bold block">
                STAGE 4
              </span>
              <span className="font-mono text-xs font-bold text-white block">
                OFFLINE AI MENTOR
              </span>
              <p className="text-[11px] text-[#7B6E94] font-mono">
                Local on-device reasoning and hint assistant without cloud API calls.
              </p>
            </div>
          </div>
        </PixelCard>
      </div>

      {/* In-Place Profile Edit Dialog */}
      <ProfileEditDialog
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        profile={profile}
        onSave={async (updates) => {
          await updateProfile(profile.id, updates);
        }}
      />

      {/* Destructive Profile Reset Dialog */}
      <ProfileResetDialog
        isOpen={isResetOpen}
        onClose={() => setIsResetOpen(false)}
        profileName={profile.displayName}
        onConfirmReset={async () => {
          await resetProfile(profile.id);
          router.push("/setup");
        }}
      />
    </div>
  );
}
