"use client";

import { DotIcon } from "@/components/retro/dot-icon";

import React, { useState } from "react";
import { PixelButton } from "@/components/retro/pixel-button";
import { PixelBadge } from "@/components/retro/pixel-badge";

export interface ProfileResetDialogProps {
  isOpen: boolean;
  onClose: () => void;
  profileName: string;
  onConfirmReset: () => Promise<void>;
}

export function ProfileResetDialog({
  isOpen,
  onClose,
  profileName,
  onConfirmReset,
}: ProfileResetDialogProps) {
  const [confirmationInput, setConfirmationInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const isConfirmed = confirmationInput.trim().toUpperCase() === "RESET";

  const handleReset = async () => {
    if (!isConfirmed) return;

    setIsDeleting(true);
    setError(null);
    try {
      await onConfirmReset();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to reset profile";
      setError(message);
      setIsDeleting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reset-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs"
      onKeyDown={(e) => {
        if (e.key === "Escape" && !isDeleting) onClose();
      }}
    >
      <div className="w-full max-w-md bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] shadow-none p-6 space-y-5 text-foreground">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
          <div className="flex items-center gap-2">
            <PixelBadge variant="pink">DANGER</PixelBadge>
            <h3 id="reset-dialog-title" className="font-heading text-lg sm:text-xl text-[var(--color-pink)]">
              Reset local profile
            </h3>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            aria-label="Close dialog"
            className="text-[var(--color-text-muted)] hover:text-[var(--color-pink)] font-sans text-sm px-2 py-1 transition-colors"
          >
            <DotIcon name="close" size={14} aria-hidden="true" />
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-lg p-2.5 bg-[var(--color-elevated)] border border-[var(--color-pink)] text-[var(--color-pink)] font-sans text-xs">
            {error}
          </div>
        )}

        {/* Warning text */}
        <div className="space-y-3 text-xs font-sans text-[var(--color-text-muted)]">
          <p>
            You are about to permanently delete the local profile for{" "}
            <strong className="text-foreground underline">{profileName}</strong> from this browser&apos;s IndexedDB.
          </p>
          <div className="rounded-lg p-3 bg-[var(--color-elevated)] border border-[var(--color-pink)]/50 text-[var(--color-pink)] space-y-1">
            <span className="font-bold block">This cannot be undone</span>
            <p className="text-[11px] leading-relaxed">
              This action cannot be undone. All local progress, preferences, and identity records on this device will be erased. Unrelated browser databases will not be touched.
            </p>
          </div>
          <p>
            To confirm deletion, type <strong className="text-[var(--color-pink)]">RESET</strong> below:
          </p>
        </div>

        {/* Confirmation Input */}
        <div>
          <input
            type="text"
            value={confirmationInput}
            onChange={(e) => setConfirmationInput(e.target.value)}
            placeholder="Type RESET to confirm"
            autoFocus
            disabled={isDeleting}
            className="w-full rounded-lg px-3 py-2 bg-[var(--color-canvas)] border border-[var(--color-pink)]/60 focus:border-[var(--color-pink)] text-foreground font-sans text-sm outline-none transition-colors uppercase tracking-wider"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t-2 border-[var(--color-border)]">
          <PixelButton
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </PixelButton>
          <PixelButton
            variant="pink"
            size="sm"
            onClick={handleReset}
            disabled={!isConfirmed || isDeleting}
          >
            {isDeleting ? "Deleting…" : "Delete profile"}
          </PixelButton>
        </div>
      </div>
    </div>
  );
}
