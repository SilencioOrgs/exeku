"use client";

import React from "react";
import { PixelBadge } from "@/components/retro/pixel-badge";
import { DotIcon } from "@/components/retro/dot-icon";
import { cn } from "@/lib/utils";

export interface StepIdentityProps {
  displayName: string;
  bio: string;
  onChangeName: (name: string) => void;
  onChangeBio: (bio: string) => void;
  error?: string;
  touched: boolean;
  onBlurName: () => void;
}

export function StepIdentity({
  displayName,
  bio,
  onChangeName,
  onChangeBio,
  error,
  touched,
  onBlurName,
}: StepIdentityProps) {
  const isInvalid = touched && Boolean(error);
  const charCount = displayName.length;

  return (
    <div className="appearance-stack space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <PixelBadge variant="cyan">STEP 01</PixelBadge>
          <span className="text-xs font-mono text-[var(--color-text-muted)] uppercase tracking-wider">
            LOCAL IDENTITY
          </span>
        </div>
        <h2 className="font-heading text-2xl sm:text-3xl text-[var(--color-text-main)] tracking-wide">
          WELCOME, CODER_
        </h2>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          Let&apos;s set up your local coding profile. No cloud accounts, no email, no surveillance.
        </p>
      </div>

      {/* Display Name Input */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label
            htmlFor="display-name"
            className="block text-xs font-mono uppercase tracking-wider text-[var(--color-text-main)]"
          >
            Display Name <span className="text-[var(--color-pink)]">*</span>
          </label>
          <span
            className={cn(
              "text-xs font-mono",
              charCount > 32
                ? "text-[var(--color-pink)]"
                : charCount >= 2
                ? "text-[var(--color-mint)]"
                : "text-[var(--color-text-dim)]"
            )}
            aria-live="polite"
          >
            {charCount}/32
          </span>
        </div>

        <div className="relative">
          <input
            id="display-name"
            type="text"
            value={displayName}
            onChange={(e) => onChangeName(e.target.value)}
            onBlur={onBlurName}
            maxLength={32}
            autoFocus
            aria-required="true"
            aria-invalid={isInvalid}
            aria-describedby={isInvalid ? "name-error" : "name-hint"}
            placeholder="e.g. ByteHacker42"
            className={cn(
              "w-full px-4 py-3 bg-[var(--color-canvas)] text-[var(--color-text-main)] font-mono text-sm border-2 transition-all outline-none",
              isInvalid
                ? "border-[var(--color-pink)] [box-shadow:var(--shadow-btn)] focus:border-[var(--color-pink)]"
                : "border-[var(--color-border)] focus:border-[var(--color-accent)] focus:[box-shadow:var(--shadow-btn)]",
              "placeholder:text-[var(--color-text-dim)]"
            )}
          />
        </div>

        {isInvalid ? (
          <p
            id="name-error"
            role="alert"
            className="flex items-center gap-1.5 text-xs font-mono text-[var(--color-pink)] mt-1.5"
          >
            <span className="font-bold">[!]</span>
            <span>{error}</span>
          </p>
        ) : (
          <p id="name-hint" className="text-xs text-[var(--color-text-dim)] font-mono">
            Accepts 2–32 characters: letters, numbers, spaces, underscores, and dashes.
          </p>
        )}
      </div>

      {/* Bio / Tagline Input (Optional) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label
            htmlFor="profile-bio"
            className="block text-xs font-mono uppercase tracking-wider text-[var(--color-text-muted)]"
          >
            Tagline or Bio <span className="text-[var(--color-text-dim)]">(optional)</span>
          </label>
          <span className="text-xs font-mono text-[var(--color-text-dim)]">
            {bio.length}/100
          </span>
        </div>

        <input
          id="profile-bio"
          type="text"
          value={bio}
          onChange={(e) => onChangeBio(e.target.value)}
          maxLength={100}
          placeholder="e.g. Systems enthusiast, mastering pointers and algorithms"
          className="w-full px-4 py-3 bg-[var(--color-canvas)] text-[var(--color-text-main)] font-mono text-sm border-2 border-[var(--color-border)] focus:border-[var(--color-primary)] focus:[box-shadow:var(--shadow-btn)] transition-all outline-none placeholder:text-[var(--color-text-dim)]"
        />
      </div>

      {/* Offline Assurance Callout */}
      <div className="flex items-start gap-3 p-3.5 bg-[var(--color-canvas)] border border-[var(--color-border)] text-[var(--color-text-muted)]">
        <DotIcon name="shield" size={18} className="text-[var(--color-mint)] mt-0.5" />
        <div className="text-xs font-mono space-y-0.5">
          <span className="text-[var(--color-mint)] font-bold block">
            100% OFFLINE PERSISTENCE
          </span>
          <p className="text-[var(--color-text-dim)]">
            Profile data is written strictly into local IndexedDB on this machine. Never sent to any cloud server or telemetry endpoint.
          </p>
        </div>
      </div>
    </div>
  );
}
