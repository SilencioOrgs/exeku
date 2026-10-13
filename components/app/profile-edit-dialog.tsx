"use client";

import React, { useState } from "react";
import type { LocalProfile, ProfileInput, ExperienceLevel, PreferredLanguage } from "@/types/profile";
import { AVATARS } from "@/lib/avatars";
import { validateDisplayName } from "@/lib/profile-validation";
import { PixelAvatar } from "@/components/retro/pixel-avatar";
import { PixelButton } from "@/components/retro/pixel-button";
import { PixelBadge } from "@/components/retro/pixel-badge";
import { DotIcon, type DotIconName } from "@/components/retro/dot-icon";
import { cn } from "@/lib/utils";

export interface ProfileEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  profile: LocalProfile;
  onSave: (updates: Partial<ProfileInput>) => Promise<void>;
}

const LANGUAGES: { id: PreferredLanguage; label: string; icon: DotIconName }[] = [
  { id: "python", label: "Python 3", icon: "python" },
  { id: "java", label: "Java", icon: "java" },
  { id: "cpp", label: "C++", icon: "cplusplus" },
  { id: "c", label: "C", icon: "file" },
];

const LEVELS: { id: ExperienceLevel; label: string }[] = [
  { id: "beginner", label: "Beginner" },
  { id: "intermediate", label: "Intermediate" },
  { id: "advanced", label: "Advanced" },
];

export function ProfileEditDialog(props: ProfileEditDialogProps) {
  if (!props.isOpen) return null;
  return <ProfileEditModalContent {...props} />;
}

function ProfileEditModalContent({
  onClose,
  profile,
  onSave,
}: ProfileEditDialogProps) {
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [bio, setBio] = useState(profile.bio || "");
  const [avatarId, setAvatarId] = useState(profile.avatarId);
  const [experienceLevel, setExperienceLevel] = useState(profile.experienceLevel);
  const [preferredLanguage, setPreferredLanguage] = useState(profile.preferredLanguage);

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validation = validateDisplayName(displayName);

  const handleSave = async () => {
    if (!validation.isValid) {
      setError(validation.error || "Invalid display name");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await onSave({
        displayName: validation.trimmed,
        bio: bio.trim() || undefined,
        avatarId,
        experienceLevel,
        preferredLanguage,
      });
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save profile";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs"
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div className="w-full max-w-lg bg-[#120A24] border-2 border-[#9E00FF] shadow-[6px_6px_0px_#000000,0_0_24px_rgba(158,0,255,0.2)] p-6 space-y-5 text-white max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-[#2E1A57] pb-3">
          <div className="flex items-center gap-2">
            <PixelBadge variant="purple">EDIT</PixelBadge>
            <h3 id="edit-dialog-title" className="font-pixel text-lg sm:text-xl text-white">
              EDIT LOCAL PROFILE_
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="text-[#A79EC4] hover:text-[#FF007A] font-mono text-sm px-2 py-1 border border-transparent hover:border-[#FF007A] transition-colors"
          >
            ✕
          </button>
        </div>

        {error && (
          <div role="alert" className="p-2.5 bg-[#290B1E] border border-[#FF007A] text-[#FF007A] font-mono text-xs">
            [ERROR] {error}
          </div>
        )}

        {/* Display Name */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-mono">
            <label htmlFor="edit-name" className="text-[#F5F3FF] uppercase tracking-wide">
              Display Name
            </label>
            <span className={validation.isValid ? "text-[#00FF9D]" : "text-[#FF007A]"}>
              {displayName.length}/32
            </span>
          </div>
          <input
            id="edit-name"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={32}
            className="w-full px-3 py-2 bg-[#090514] border-2 border-[#2E1A57] focus:border-[#00F0FF] text-white font-mono text-sm outline-none transition-colors"
          />
        </div>

        {/* Tagline / Bio */}
        <div className="space-y-1.5">
          <label htmlFor="edit-bio" className="block text-xs font-mono text-[#A79EC4] uppercase tracking-wide">
            Tagline / Bio (optional)
          </label>
          <input
            id="edit-bio"
            type="text"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={100}
            className="w-full px-3 py-2 bg-[#090514] border-2 border-[#2E1A57] focus:border-[#9E00FF] text-white font-mono text-sm outline-none transition-colors"
          />
        </div>

        {/* Avatar Selection Grid */}
        <div className="space-y-1.5">
          <span className="block text-xs font-mono text-[#F5F3FF] uppercase tracking-wide">
            Avatar Selection
          </span>
          <div className="grid grid-cols-4 gap-2">
            {AVATARS.map((av) => {
              const isSelected = av.id === avatarId;
              return (
                <div
                  key={av.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setAvatarId(av.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setAvatarId(av.id);
                    }
                  }}
                  className={cn(
                    "p-2 border-2 cursor-pointer flex flex-col items-center gap-1 bg-[#090514] transition-all select-none",
                    isSelected
                      ? "border-[#00F0FF] shadow-[0_0_8px_rgba(0,240,255,0.3)]"
                      : "border-[#2E1A57] hover:border-[#9E00FF]"
                  )}
                >
                  <PixelAvatar avatarId={av.id} size={36} />
                  <span className="text-[10px] font-mono text-center truncate w-full text-[#A79EC4]">
                    {av.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Primary Language */}
        <div className="space-y-1.5">
          <span className="block text-xs font-mono text-[#F5F3FF] uppercase tracking-wide">
            Primary Language
          </span>
          <div className="grid grid-cols-2 gap-2">
            {LANGUAGES.map((lang) => {
              const isSelected = lang.id === preferredLanguage;
              return (
                <div
                  key={lang.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setPreferredLanguage(lang.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setPreferredLanguage(lang.id);
                    }
                  }}
                  className={cn(
                    "p-2 border-2 cursor-pointer flex items-center gap-2 bg-[#090514] select-none",
                    isSelected
                      ? "border-[#00F0FF] text-[#00F0FF]"
                      : "border-[#2E1A57] text-[#A79EC4] hover:border-[#9E00FF]"
                  )}
                >
                  <DotIcon name={lang.icon} size={16} />
                  <span className="text-xs font-mono font-bold">{lang.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Experience Level */}
        <div className="space-y-1.5">
          <span className="block text-xs font-mono text-[#F5F3FF] uppercase tracking-wide">
            Experience Level
          </span>
          <div className="grid grid-cols-3 gap-2">
            {LEVELS.map((lvl) => {
              const isSelected = lvl.id === experienceLevel;
              return (
                <button
                  key={lvl.id}
                  type="button"
                  onClick={() => setExperienceLevel(lvl.id)}
                  className={cn(
                    "py-2 px-1 text-xs font-mono border-2 transition-colors select-none",
                    isSelected
                      ? "bg-[#092418] border-[#00FF9D] text-[#00FF9D]"
                      : "bg-[#090514] border-[#2E1A57] text-[#A79EC4] hover:border-[#9E00FF]"
                  )}
                >
                  {lvl.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t-2 border-[#2E1A57]">
          <PixelButton variant="ghost" size="sm" onClick={onClose} disabled={isSaving}>
            CANCEL
          </PixelButton>
          <PixelButton
            variant="cyan"
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? "SAVING..." : "SAVE CHANGES ▶"}
          </PixelButton>
        </div>
      </div>
    </div>
  );
}
