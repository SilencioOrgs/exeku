"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

import React, { useState } from "react";
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

  const isConfirmed = confirmationInput.trim().toUpperCase() === "RESET";

  const handleClose = () => {
    if (isDeleting) return;
    setConfirmationInput("");
    setError(null);
    onClose();
  };

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
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="border-[var(--color-pink)] sm:max-w-md">
        <DialogHeader className="border-b border-[var(--color-border)] pb-3">
          <div className="flex items-center gap-2">
            <PixelBadge variant="pink">Danger</PixelBadge>
            <DialogTitle className="text-[var(--color-pink)]">Reset local profile</DialogTitle>
          </div>
          <DialogDescription className="text-xs">
            You are about to permanently delete the local profile for{" "}
            <strong className="text-foreground underline">{profileName}</strong> from this browser&apos;s IndexedDB.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div role="alert" className="rounded-lg border border-[var(--color-pink)] bg-[var(--color-elevated)] p-2.5 text-xs text-[var(--color-pink)]">
            {error}
          </div>
        )}

        <div className="space-y-3 text-xs text-[var(--color-text-muted)]">
          <div className="space-y-1 rounded-lg border border-[var(--color-pink)]/50 bg-[var(--color-elevated)] p-3 text-[var(--color-pink)]">
            <span className="block font-semibold">Permanent consequence</span>
            <p className="text-xs leading-relaxed">
              This action cannot be undone. All local progress, preferences, and saved code drafts on this device will be erased. Unrelated browser databases will not be touched.
            </p>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="reset-profile-confirm" className="block text-xs text-[var(--color-text-muted)]">
              To confirm deletion, type <strong className="text-[var(--color-pink)]">RESET</strong> below:
            </label>
            <Input
              id="reset-profile-confirm"
              type="text"
              value={confirmationInput}
              onChange={(e) => setConfirmationInput(e.target.value)}
              placeholder="Type RESET to confirm"
              autoFocus
              disabled={isDeleting}
              className="skeuo-well h-10"
            />
          </div>
        </div>

        <DialogFooter className="border-t border-[var(--color-border)] pt-3">
          <Button type="button" variant="outline" size="sm" onClick={handleClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" size="sm" onClick={handleReset} disabled={!isConfirmed} loading={isDeleting} loadingText="Deleting…">
            Delete profile
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
