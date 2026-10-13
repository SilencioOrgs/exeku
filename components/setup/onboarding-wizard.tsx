"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useProfile } from "@/hooks/use-profile";
import { validateDisplayName } from "@/lib/profile-validation";
import { DEFAULT_AVATAR_ID } from "@/lib/avatars";
import type { ExperienceLevel, PreferredLanguage } from "@/types/profile";
import { PixelCard } from "@/components/retro/pixel-card";
import { PixelButton } from "@/components/retro/pixel-button";
import { PixelBadge } from "@/components/retro/pixel-badge";
import { DotIcon } from "@/components/retro/dot-icon";
import { StepIdentity } from "./step-identity";
import { StepAvatar } from "./step-avatar";
import { StepLoadout } from "./step-loadout";
import { cn } from "@/lib/utils";

export function OnboardingWizard() {
  const router = useRouter();
  const { profile, isLoading, saveProfile } = useProfile();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [displayName, setDisplayName] = useState<string>("");
  const [bio, setBio] = useState<string>("");
  const [avatarId, setAvatarId] = useState<string>(DEFAULT_AVATAR_ID);
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>("beginner");
  const [preferredLanguage, setPreferredLanguage] = useState<PreferredLanguage>("python");

  const [touched, setTouched] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const validation = validateDisplayName(displayName);

  const handleNextFromIdentity = () => {
    setTouched(true);
    if (!validation.isValid) {
      return;
    }
    setStep(2);
  };

  const handleFinalSubmit = async () => {
    setTouched(true);
    if (!validation.isValid) {
      setStep(1);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await saveProfile({
        displayName: displayName.trim(),
        bio: bio.trim() || undefined,
        avatarId,
        experienceLevel,
        preferredLanguage,
      });
      router.push("/app");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save profile";
      setSubmitError(message);
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#090514] flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#00F0FF] border-t-transparent animate-spin" />
          <span className="font-mono text-xs text-[#00F0FF] uppercase tracking-widest animate-pulse">
            INITIALIZING SECURE LOCAL STORAGE...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090514] text-white flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background Pixel Grid Texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage:
            "linear-gradient(to right, #2E1A57 1px, transparent 1px), linear-gradient(to bottom, #2E1A57 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      <div className="w-full max-w-2xl relative z-10 space-y-6">
        {/* Top Header & Branding */}
        <div className="flex items-center justify-between">
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

          <PixelBadge variant="muted" bracketed>
            OFFLINE PROFILE V1
          </PixelBadge>
        </div>

        {/* Existing Profile Warning Banner */}
        {profile && (
          <div className="p-4 bg-[#1B0F36] border-2 border-[#9E00FF] shadow-[4px_4px_0px_#000000] space-y-3">
            <div className="flex items-center gap-2">
              <DotIcon name="stars" size={18} className="text-[#00F0FF]" />
              <span className="font-mono text-xs font-bold text-white uppercase tracking-wider">
                EXISTING LOCAL PROFILE DETECTED
              </span>
            </div>
            <p className="text-xs font-mono text-[#A79EC4]">
              A profile for <strong className="text-white">{profile.displayName}</strong> already exists on this machine. You can jump directly to the workspace or re-configure this profile.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <PixelButton
                variant="cyan"
                size="sm"
                onClick={() => router.push("/app")}
              >
                CONTINUE TO APP ▶
              </PixelButton>
              <PixelButton
                variant="ghost"
                size="sm"
                onClick={() => {
                  setDisplayName(profile.displayName);
                  setBio(profile.bio || "");
                  setAvatarId(profile.avatarId);
                  setExperienceLevel(profile.experienceLevel);
                  setPreferredLanguage(profile.preferredLanguage);
                }}
              >
                LOAD EXISTING DATA
              </PixelButton>
            </div>
          </div>
        )}

        {/* Wizard Main Card */}
        <PixelCard variant="elevated" className="border-2 border-[#3D2275]">
          {/* Step Breadcrumbs Progress */}
          <div className="flex items-center justify-between border-b-2 border-[#2E1A57] pb-4 mb-6 text-xs font-mono select-none">
            <div className="flex items-center gap-1 sm:gap-2">
              <span
                className={cn(
                  "px-2 py-1 border transition-colors",
                  step === 1
                    ? "bg-[#00F0FF] text-[#090514] font-bold border-white"
                    : "bg-[#090514] text-[#7B6E94] border-[#2E1A57]"
                )}
              >
                01 IDENTITY
              </span>
              <span className="text-[#4E3970]">▶</span>
              <span
                className={cn(
                  "px-2 py-1 border transition-colors",
                  step === 2
                    ? "bg-[#FF007A] text-white font-bold border-white"
                    : "bg-[#090514] text-[#7B6E94] border-[#2E1A57]"
                )}
              >
                02 AVATAR
              </span>
              <span className="text-[#4E3970]">▶</span>
              <span
                className={cn(
                  "px-2 py-1 border transition-colors",
                  step === 3
                    ? "bg-[#00FF9D] text-[#090514] font-bold border-white"
                    : "bg-[#090514] text-[#7B6E94] border-[#2E1A57]"
                )}
              >
                03 LOADOUT
              </span>
            </div>

            <span className="text-[#7B6E94] hidden sm:inline">
              STEP {step}/3
            </span>
          </div>

          {/* Submission Error Banner */}
          {submitError && (
            <div
              role="alert"
              className="p-3 mb-6 bg-[#290B1E] border-2 border-[#FF007A] text-[#FF007A] font-mono text-xs flex items-center gap-2"
            >
              <span className="font-bold">[ERROR]</span>
              <span>{submitError}</span>
            </div>
          )}

          {/* Wizard Steps */}
          {step === 1 && (
            <StepIdentity
              displayName={displayName}
              bio={bio}
              onChangeName={setDisplayName}
              onChangeBio={setBio}
              error={validation.error}
              touched={touched}
              onBlurName={() => setTouched(true)}
            />
          )}

          {step === 2 && (
            <StepAvatar
              selectedAvatarId={avatarId}
              onSelectAvatar={setAvatarId}
            />
          )}

          {step === 3 && (
            <StepLoadout
              displayName={displayName}
              avatarId={avatarId}
              experienceLevel={experienceLevel}
              preferredLanguage={preferredLanguage}
              onChangeExperience={setExperienceLevel}
              onChangeLanguage={setPreferredLanguage}
            />
          )}

          {/* Wizard Navigation Footer */}
          <div className="flex items-center justify-between pt-6 mt-8 border-t-2 border-[#2E1A57]">
            {step > 1 ? (
              <PixelButton
                variant="secondary"
                size="md"
                onClick={() => setStep((s) => (s - 1) as 1 | 2)}
                disabled={isSubmitting}
              >
                ◀ BACK
              </PixelButton>
            ) : (
              <div />
            )}

            {step < 3 ? (
              <PixelButton
                variant="cyan"
                size="md"
                onClick={step === 1 ? handleNextFromIdentity : () => setStep(3)}
              >
                NEXT STEP ▶
              </PixelButton>
            ) : (
              <PixelButton
                variant="primary"
                size="md"
                onClick={handleFinalSubmit}
                disabled={isSubmitting}
                className="bg-[#00FF9D] text-[#090514] border-[#FFFFFF] hover:bg-[#00E58D] font-bold"
              >
                {isSubmitting ? "STORING PROFILE..." : "CREATE PROFILE ▶"}
              </PixelButton>
            )}
          </div>
        </PixelCard>
      </div>
    </div>
  );
}
