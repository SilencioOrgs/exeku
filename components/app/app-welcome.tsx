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
  python: { label: "Python 3", icon: "python", accent: "var(--color-accent)" },
  java: { label: "Java", icon: "java", accent: "var(--color-pink)" },
  cpp: { label: "C++", icon: "cplusplus", accent: "var(--color-primary-text)" },
  c: { label: "C", icon: "file", accent: "var(--color-mint)" },
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
      <div className="min-h-screen bg-[var(--color-canvas)] flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[var(--color-accent)] border-t-transparent animate-spin" />
          <span className="font-mono text-xs text-[var(--color-accent)] uppercase tracking-widest animate-pulse">
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
    <div className="min-h-screen bg-[var(--color-canvas)] text-[var(--color-text-main)] flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background Pixel Grid */}
      <div
        className="arcade-decoration absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage:
            "linear-gradient(to right, var(--color-border) 1px, transparent 1px), linear-gradient(to bottom, var(--color-border) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      <div className="w-full max-w-3xl relative z-10 space-y-6">
        {/* Top App Bar */}
        <header className="flex items-center justify-between border-b-2 border-[var(--color-border)] pb-4">
          <Link
            href="/"
            className="flex items-center gap-2.5 text-[var(--color-text-main)] hover:text-[var(--color-accent)] transition-colors group"
          >
            <div className="w-8 h-8 bg-[var(--color-primary)] text-[var(--color-primary-foreground)] border border-[var(--color-accent)] flex items-center justify-center font-heading text-base font-bold [box-shadow:var(--shadow-btn)]">
              E
            </div>
            <span className="font-heading text-xl tracking-wider text-[var(--color-text-main)] group-hover:text-[var(--color-accent)]">
              EXE<span className="text-[var(--color-accent)]">KU</span>
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
        <PixelCard variant="elevated" className="border-2 border-[var(--color-border)] p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <PixelAvatar
              avatarId={profile.avatarId}
              size={72}
              className="border-2 [box-shadow:var(--shadow-btn)]"
            />

            <div className="flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-heading text-2xl sm:text-3xl text-[var(--color-text-main)] tracking-wide">
                  WELCOME, {profile.displayName.toUpperCase()}_
                </span>
                <PixelBadge variant="cyan" bracketed={false} className="text-xs">
                  {avatarMeta.name}
                </PixelBadge>
              </div>

              {profile.bio ? (
                <p className="text-sm font-mono text-[var(--color-text-main)] pt-1">
                  &ldquo;{profile.bio}&rdquo;
                </p>
              ) : (
                <p className="text-xs font-mono text-[var(--color-text-muted)] pt-1">
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
                EDIT PROFILE <DotIcon name="pencil" size={14} aria-hidden="true" />
              </PixelButton>
              <PixelButton
                variant="ghost"
                size="sm"
                onClick={() => setIsResetOpen(true)}
                className="flex-1 sm:flex-none text-[var(--color-pink)] hover:border-[var(--color-pink)]"
              >
                RESET <DotIcon name="close" size={14} aria-hidden="true" />
              </PixelButton>
            </div>
          </div>

          {/* Profile Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 mt-6 border-t-2 border-[var(--color-border)] text-xs font-mono">
            <div className="p-3 bg-[var(--color-canvas)] border border-[var(--color-border)]">
              <span className="text-[var(--color-text-dim)] block uppercase text-[0.625rem]">
                PRIMARY TARGET
              </span>
              <div className="flex items-center gap-1.5 mt-1 font-bold text-[var(--color-text-main)]">
                <DotIcon
                  name={langMeta.icon}
                  size={16}
                  style={{ color: langMeta.accent }}
                />
                <span style={{ color: langMeta.accent }}>{langMeta.label}</span>
              </div>
            </div>

            <div className="p-3 bg-[var(--color-canvas)] border border-[var(--color-border)]">
              <span className="text-[var(--color-text-dim)] block uppercase text-[0.625rem]">
                SKILL BRACKET
              </span>
              <span className="font-bold text-[var(--color-mint)] mt-1 block uppercase">
                {profile.experienceLevel}
              </span>
            </div>

            <div className="p-3 bg-[var(--color-canvas)] border border-[var(--color-border)]">
              <span className="text-[var(--color-text-dim)] block uppercase text-[0.625rem]">
                STORAGE LOCALITY
              </span>
              <span className="font-bold text-[var(--color-primary-text)] mt-1 block truncate">
                IndexedDB (exeku_local_v1)
              </span>
            </div>

            <div className="p-3 bg-[var(--color-canvas)] border border-[var(--color-border)]">
              <span className="text-[var(--color-text-dim)] block uppercase text-[0.625rem]">
                INITIALIZED ON
              </span>
              <span className="font-bold text-[var(--color-text-main)] mt-1 block">
                {createdDate}
              </span>
            </div>
          </div>
        </PixelCard>

        {/* Temporary Roadmap Card */}
        <PixelCard variant="default" className="border-2 border-[var(--color-border)] p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
            <div className="flex items-center gap-2">
              <DotIcon name="stars" size={18} className="text-[var(--color-accent)]" />
              <h3 className="font-heading text-base sm:text-lg text-[var(--color-text-main)]">
                NEXT STAGES: COMING SOON_
              </h3>
            </div>
            <PixelBadge variant="purple">ROADMAP</PixelBadge>
          </div>

          <p className="text-xs sm:text-sm font-mono text-[var(--color-text-muted)] leading-relaxed">
            Your local profile and loadout preferences are securely stored on your machine.
            The Monaco coding workspace, offline compilation sandbox, and automated grading engine will be implemented in subsequent phases.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-3 bg-[var(--color-canvas)] border border-[var(--color-border)] space-y-1">
              <span className="text-[0.625rem] font-mono text-[var(--color-accent)] font-bold block">
                STAGE 2
              </span>
              <span className="font-mono text-xs font-bold text-[var(--color-text-main)] block">
                LOCAL EXECUTION
              </span>
              <p className="text-[0.6875rem] text-[var(--color-text-muted)] font-mono">
                Isolated runner for Python 3, Java, C++, and C on Windows.
              </p>
            </div>

            <div className="p-3 bg-[var(--color-canvas)] border border-[var(--color-border)] space-y-1">
              <span className="text-[0.625rem] font-mono text-[var(--color-pink)] font-bold block">
                STAGE 3
              </span>
              <span className="font-mono text-xs font-bold text-[var(--color-text-main)] block">
                AUTOMATIC GRADING
              </span>
              <p className="text-[0.6875rem] text-[var(--color-text-muted)] font-mono">
                Offline unit testing, test-case verifier, and progress tracking.
              </p>
            </div>

            <div className="p-3 bg-[var(--color-canvas)] border border-[var(--color-border)] space-y-1">
              <span className="text-[0.625rem] font-mono text-[var(--color-mint)] font-bold block">
                STAGE 4
              </span>
              <span className="font-mono text-xs font-bold text-[var(--color-text-main)] block">
                OFFLINE AI MENTOR
              </span>
              <p className="text-[0.6875rem] text-[var(--color-text-muted)] font-mono">
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
