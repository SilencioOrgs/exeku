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
      <div className="w-full max-w-lg bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] shadow-none p-6 space-y-5 text-foreground max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
          <div className="flex items-center gap-2">
            <PixelBadge variant="purple">EDIT</PixelBadge>
            <h3 id="edit-dialog-title" className="font-heading text-lg sm:text-xl text-foreground">
              Edit profile
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] font-sans text-sm px-2 py-1 rounded-lg border border-transparent hover:bg-[var(--color-elevated)] transition-colors"
          >
            <DotIcon name="close" size={14} aria-hidden="true" />
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-lg p-2.5 bg-[var(--color-elevated)] border border-[var(--color-pink)] text-[var(--color-pink)] font-sans text-xs">
            {error}
          </div>
        )}

        {/* Display Name */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-sans">
            <label htmlFor="edit-name" className="text-[var(--color-text-main)] normal-case tracking-normal">
              Display Name
            </label>
            <span className={validation.isValid ? "text-[var(--color-text-muted)]" : "text-[var(--color-pink)]"}>
              {displayName.length}/32
            </span>
          </div>
          <input
            id="edit-name"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={32}
            className="w-full rounded-lg px-3 py-2 bg-[var(--color-canvas)] rounded-lg border border-[var(--color-border)] focus:border-[var(--color-text-main)] text-foreground font-sans text-sm outline-none transition-colors"
          />
        </div>

        {/* Tagline / Bio */}
        <div className="space-y-1.5">
          <label htmlFor="edit-bio" className="block text-xs font-sans text-[var(--color-text-muted)] normal-case tracking-normal">
            Tagline / Bio (optional)
          </label>
          <input
            id="edit-bio"
            type="text"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={100}
            className="w-full px-3 py-2 bg-[var(--color-canvas)] rounded-lg border border-[var(--color-border)] focus:border-[var(--color-primary)] text-foreground font-sans text-sm outline-none transition-colors"
          />
        </div>

        {/* Avatar Selection Grid */}
        <div className="space-y-1.5">
          <span className="block text-xs font-sans text-[var(--color-text-main)] normal-case tracking-normal">
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
                    "rounded-lg p-2 border cursor-pointer rounded-lg flex flex-col items-center gap-1 bg-[var(--color-canvas)] transition-all select-none",
                    isSelected
                      ? "border-[var(--color-text-main)] shadow-none [border-radius:var(--radius-card)]"
                      : "border-[var(--color-border)] hover:border-[var(--color-primary)]"
                  )}
                >
                  <PixelAvatar avatarId={av.id} size={36} />
                  <span className="text-[10px] font-sans text-center truncate w-full text-[var(--color-text-muted)]">
                    {av.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Primary Language */}
        <div className="space-y-1.5">
          <span className="block text-xs font-sans text-[var(--color-text-main)] normal-case tracking-normal">
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
                    "p-2 border cursor-pointer rounded-lg flex items-center gap-2 bg-[var(--color-canvas)] select-none",
                    isSelected
                      ? "border-[var(--color-text-main)] text-[var(--color-text-main)]"
                      : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]"
                  )}
                >
                  <DotIcon name={lang.icon} size={16} />
                  <span className="text-xs font-sans font-bold">{lang.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Experience Level */}
        <div className="space-y-1.5">
          <span className="block text-xs font-sans text-[var(--color-text-main)] normal-case tracking-normal">
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
                    "rounded-lg py-2 px-1 text-xs font-sans border transition-colors select-none",
                    isSelected
                      ? "bg-[var(--color-elevated)] border-[var(--color-text-main)] text-[var(--color-text-muted)]"
                      : "bg-[var(--color-canvas)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]"
                  )}
                >
                  {lvl.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t-2 border-[var(--color-border)]">
          <PixelButton variant="ghost" size="sm" onClick={onClose} disabled={isSaving}>
            Cancel
          </PixelButton>
          <PixelButton
            variant="cyan"
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? "Saving…" : "Save changes"}
          </PixelButton>
        </div>
      </div>
    </div>
  );
}
