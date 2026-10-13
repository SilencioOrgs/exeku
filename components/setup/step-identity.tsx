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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <PixelBadge variant="cyan">STEP 01</PixelBadge>
          <span className="text-xs font-mono text-[#A79EC4] uppercase tracking-wider">
            LOCAL IDENTITY
          </span>
        </div>
        <h2 className="font-pixel text-2xl sm:text-3xl text-white tracking-wide">
          WELCOME, CODER_
        </h2>
        <p className="text-sm text-[#A79EC4] mt-1">
          Let&apos;s set up your local coding profile. No cloud accounts, no email, no surveillance.
        </p>
      </div>

      {/* Display Name Input */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label
            htmlFor="display-name"
            className="block text-xs font-mono uppercase tracking-wider text-[#F5F3FF]"
          >
            Display Name <span className="text-[#FF007A]">*</span>
          </label>
          <span
            className={cn(
              "text-xs font-mono",
              charCount > 32
                ? "text-[#FF007A]"
                : charCount >= 2
                ? "text-[#00FF9D]"
                : "text-[#6B5A8A]"
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
              "w-full px-4 py-3 bg-[#090514] text-white font-mono text-sm border-2 transition-all outline-none",
              isInvalid
                ? "border-[#FF007A] shadow-[0_0_12px_rgba(255,0,122,0.25)] focus:border-[#FF007A]"
                : "border-[#2E1A57] focus:border-[#00F0FF] focus:shadow-[0_0_12px_rgba(0,240,255,0.2)]",
              "placeholder:text-[#523A7D]"
            )}
          />
        </div>

        {isInvalid ? (
          <p
            id="name-error"
            role="alert"
            className="flex items-center gap-1.5 text-xs font-mono text-[#FF007A] mt-1.5"
          >
            <span className="font-bold">[!]</span>
            <span>{error}</span>
          </p>
        ) : (
          <p id="name-hint" className="text-xs text-[#6B5A8A] font-mono">
            Accepts 2–32 characters: letters, numbers, spaces, underscores, and dashes.
          </p>
        )}
      </div>

      {/* Bio / Tagline Input (Optional) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label
            htmlFor="profile-bio"
            className="block text-xs font-mono uppercase tracking-wider text-[#A79EC4]"
          >
            Tagline or Bio <span className="text-[#6B5A8A]">(optional)</span>
          </label>
          <span className="text-xs font-mono text-[#6B5A8A]">
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
          className="w-full px-4 py-3 bg-[#090514] text-white font-mono text-sm border-2 border-[#2E1A57] focus:border-[#9E00FF] focus:shadow-[0_0_12px_rgba(158,0,255,0.2)] transition-all outline-none placeholder:text-[#523A7D]"
        />
      </div>

      {/* Offline Assurance Callout */}
      <div className="flex items-start gap-3 p-3.5 bg-[#0E071D] border border-[#2E1A57] text-[#A79EC4]">
        <DotIcon name="shield" size={18} className="text-[#00FF9D] mt-0.5" />
        <div className="text-xs font-mono space-y-0.5">
          <span className="text-[#00FF9D] font-bold block">
            100% OFFLINE PERSISTENCE
          </span>
          <p className="text-[#84789E]">
            Profile data is written strictly into local IndexedDB on this machine. Never sent to any cloud server or telemetry endpoint.
          </p>
        </div>
      </div>
    </div>
  );
}
