"use client";

import { Check } from "lucide-react";
import { AVATARS } from "@/lib/avatars";
import { PixelAvatar } from "@/components/retro/pixel-avatar";
import { cn } from "@/lib/utils";

export interface StepAvatarProps {
  selectedAvatarId: string;
  onSelectAvatar: (avatarId: string) => void;
}

export function StepAvatar({ selectedAvatarId, onSelectAvatar }: StepAvatarProps) {
  const selected = AVATARS.find((avatar) => avatar.id === selectedAvatarId) ?? AVATARS[0];

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-xs font-medium text-[var(--color-text-muted)]">Step 2 of 3 · Profile avatar</p>
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Choose an avatar</h2>
        <p className="text-sm leading-relaxed text-[var(--color-text-muted)]">Select an avatar for your profile. You can change it later.</p>
      </div>

      <div className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-elevated)] p-4">
        <PixelAvatar avatarId={selected.id} size={52} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{selected.name}</p>
          <p className="truncate text-xs text-[var(--color-text-muted)]">{selected.role}</p>
        </div>
        <span className="text-xs text-[var(--color-text-muted)]">Selected</span>
      </div>

      <div role="group" aria-label="Choose an avatar" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {AVATARS.map((avatar) => {
          const active = avatar.id === selectedAvatarId;
          return (
            <button key={avatar.id} type="button" aria-pressed={active}
              onClick={() => onSelectAvatar(avatar.id)}
              className={cn(
                "relative flex min-w-0 flex-col items-center gap-2 rounded-xl border bg-[var(--color-surface)] p-3 text-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]",
                active ? "border-[var(--color-text-main)] bg-[var(--color-elevated)]" :
                  "border-[var(--color-border)] hover:bg-[var(--color-elevated)]",
              )}
            >
              {active && <Check size={15} aria-hidden="true" className="absolute right-2 top-2 text-[var(--color-text-main)]" />}
              <PixelAvatar avatarId={avatar.id} size={48} />
              <span className="w-full truncate text-xs font-medium">{avatar.name}</span>
              <span className="w-full truncate text-[11px] text-[var(--color-text-muted)]">{avatar.role}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
