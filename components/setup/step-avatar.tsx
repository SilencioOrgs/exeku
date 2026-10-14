"use client";

import React from "react";
import { AVATARS, type AvatarDefinition } from "@/lib/avatars";
import { PixelAvatar } from "@/components/retro/pixel-avatar";
import { PixelBadge } from "@/components/retro/pixel-badge";
import { cn } from "@/lib/utils";

export interface StepAvatarProps {
  selectedAvatarId: string;
  onSelectAvatar: (avatarId: string) => void;
}

export function StepAvatar({
  selectedAvatarId,
  onSelectAvatar,
}: StepAvatarProps) {
  const selectedMeta =
    AVATARS.find((a) => a.id === selectedAvatarId) ?? AVATARS[0];

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLDivElement>,
    avatar: AvatarDefinition
  ) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelectAvatar(avatar.id);
    }
  };

  return (
    <div className="appearance-stack space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <PixelBadge variant="pink">STEP 02</PixelBadge>
          <span className="text-xs font-mono text-[var(--color-text-muted)] uppercase tracking-wider">
            PERSONA MATRIX
          </span>
        </div>
        <h2 className="font-heading text-2xl sm:text-3xl text-[var(--color-text-main)] tracking-wide">
          SELECT YOUR AVATAR_
        </h2>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          Pick your retro pixel persona. Rendered 100% locally with zero external image requests.
        </p>
      </div>

      {/* Active Avatar Focus Spotlight */}
      <div className="p-4 bg-[var(--color-canvas)] border-2 border-[var(--color-border)] flex items-center gap-4">
        <PixelAvatar
          avatarId={selectedMeta.id}
          size={56}
          className="border-2 [box-shadow:var(--shadow-btn)]"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-base font-bold text-[var(--color-text-main)] tracking-wide truncate">
              {selectedMeta.name}
            </span>
            <PixelBadge variant="cyan" bracketed={false} className="text-[0.625rem] py-0 px-1.5">
              ACTIVE
            </PixelBadge>
          </div>
          <p className="text-xs font-mono text-[var(--color-text-muted)] mt-0.5">
            {selectedMeta.role}
          </p>
        </div>
      </div>

      {/* 8-Avatar Selection Grid */}
      <div
        role="radiogroup"
        aria-label="Avatar options"
        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
      >
        {AVATARS.map((avatar) => {
          const isSelected = avatar.id === selectedAvatarId;

          return (
            <div
              key={avatar.id}
              role="radio"
              aria-checked={isSelected}
              tabIndex={0}
              onClick={() => onSelectAvatar(avatar.id)}
              onKeyDown={(e) => handleKeyDown(e, avatar)}
              className={cn(
                "group relative p-3 border-2 cursor-pointer transition-all duration-100 outline-none select-none",
                "bg-[var(--color-surface)] hover:bg-[var(--color-elevated)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]",
                isSelected
                  ? "border-[var(--color-accent)] [box-shadow:var(--shadow-btn)]"
                  : "border-[var(--color-border)] hover:border-[var(--color-primary)] [box-shadow:var(--shadow-btn)]"
              )}
            >
              {isSelected && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[var(--color-accent)] shadow-[0_0_6px_var(--color-accent)]" />
              )}

              <div className="flex flex-col items-center text-center space-y-2">
                <PixelAvatar
                  avatarId={avatar.id}
                  size={48}
                  className="transition-transform group-hover:scale-105"
                />

                <div className="w-full">
                  <span
                    className={cn(
                      "block text-xs font-mono font-bold tracking-wide truncate",
                      isSelected ? "text-[var(--color-accent)]" : "text-[var(--color-text-main)]"
                    )}
                  >
                    {avatar.name}
                  </span>
                  <span className="block text-[0.625rem] font-mono text-[var(--color-text-muted)] truncate">
                    {avatar.role}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
