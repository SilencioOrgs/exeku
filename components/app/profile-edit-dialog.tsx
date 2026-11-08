"use client";

import { Button } from "@/components/ui/button";
import React, { useState } from "react";
import type { LocalProfile, ProfileInput, ExperienceLevel, PreferredLanguage } from "@/types/profile";
import { AVATARS } from "@/lib/avatars";
import { validateDisplayName } from "@/lib/profile-validation";
import { PixelAvatar } from "@/components/retro/pixel-avatar";
import { PixelButton } from "@/components/retro/pixel-button";
import { DotIcon, type DotIconName } from "@/components/retro/dot-icon";

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
      <div className="w-full max-w-lg bg-[var(--color-surface)] border border-[var(--color-primary)] [box-shadow:var(--shadow-card)] [border-radius:var(--radius-card)] p-6 space-y-5 text-foreground max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
          <div className="flex items-center gap-2">
            <h3 id="edit-dialog-title" className="text-lg font-semibold">
              Edit local profile
            </h3>
          </div>
          <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close dialog">
            <DotIcon name="close" size={15} aria-hidden="true" />
          </Button>
        </div>

        {error && (
          <div role="alert" className="p-2.5 bg-[var(--color-elevated)] border border-[var(--color-pink)] text-[var(--color-pink)] text-xs">
            {error}
          </div>
        )}

        {/* Display Name */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <label htmlFor="edit-name" className="text-[var(--color-text-main)]">
              Display Name
            </label>
            <span className={validation.isValid ? "text-[var(--color-primary-text)]" : "text-[var(--color-pink)]"}>
              {displayName.length}/32
            </span>
          </div>
          <input
            id="edit-name"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={32}
            className="w-full px-3 py-2 bg-[var(--color-canvas)] border border-[var(--color-border)] focus:border-[var(--color-accent)] text-foreground text-sm outline-none transition-colors"
          />
        </div>

        {/* Tagline / Bio */}
        <div className="space-y-1.5">
          <label htmlFor="edit-bio" className="block text-xs text-[var(--color-text-muted)]">
            Tagline / Bio (optional)
          </label>
          <input
            id="edit-bio"
            type="text"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={100}
            className="w-full px-3 py-2 bg-[var(--color-canvas)] border border-[var(--color-border)] focus:border-[var(--color-primary)] text-foreground text-sm outline-none transition-colors"
          />
        </div>

        {/* Avatar Selection Grid */}
        <div className="space-y-1.5">
          <span className="block text-xs text-[var(--color-text-main)]">
            Avatar
          </span>
          <div className="grid grid-cols-4 gap-2">
            {AVATARS.map((av) => {
              const isSelected = av.id === avatarId;
              return (
                <Button
                  key={av.id}
                  type="button"
                  variant="outline"
                  aria-pressed={isSelected}
                  onClick={() => setAvatarId(av.id)}
                  className="h-auto flex-col gap-1 py-2"
                >
                  <PixelAvatar avatarId={av.id} size={36} />
                  <span className="w-full truncate text-center text-xs text-[var(--color-text-muted)]">{av.name}</span>
                </Button>
              );
            })}
          </div>
        </div>

        {/* Primary Language */}
        <div className="space-y-1.5">
          <span className="block text-xs text-[var(--color-text-main)]">
            Primary language
          </span>
          <div className="grid grid-cols-2 gap-2">
            {LANGUAGES.map((lang) => {
              const isSelected = lang.id === preferredLanguage;
              return (
                <Button
                  key={lang.id}
                  type="button"
                  variant="outline"
                  aria-pressed={isSelected}
                  onClick={() => setPreferredLanguage(lang.id)}
                  className="justify-start"
                >
                  <DotIcon name={lang.icon} size={15} aria-hidden="true" />{lang.label}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Experience Level */}
        <div className="space-y-1.5">
          <span className="block text-xs text-[var(--color-text-main)]">
            Experience level
          </span>
          <div className="grid grid-cols-3 gap-2">
            {LEVELS.map((lvl) => {
              const isSelected = lvl.id === experienceLevel;
              return (
                <Button
                  key={lvl.id}
                  type="button"
                  variant="outline"
                  aria-pressed={isSelected}
                  onClick={() => setExperienceLevel(lvl.id)}
                >
                  {lvl.label}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--color-border)]">
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
