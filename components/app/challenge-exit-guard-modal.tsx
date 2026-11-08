"use client";

import { X } from "lucide-react";

import React from "react";
import { PixelCard } from "@/components/retro/pixel-card";
import { Button } from "@/components/ui/button";
import { useChallengeSession } from "@/hooks/use-challenge-session";

export function ChallengeExitGuardModal() {
  const {
    navigationPendingHref,
    formattedTime,
    cancelPendingNavigation,
    confirmPendingNavigation,
  } = useChallengeSession();

  if (!navigationPendingHref) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="guard-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs"
    >
      <PixelCard
        variant="elevated"
        className="w-full max-w-md border border-[var(--color-pink)] p-6 bg-[var(--color-surface)] space-y-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 border border-[var(--color-pink)] bg-[var(--color-canvas)] flex items-center justify-center text-[var(--color-pink)] font-semibold text-xl font-bold">
            !
          </div>
          <div>
            <h3
              id="guard-modal-title"
              className="font-semibold text-lg text-[var(--color-text-main)]"
            >
              Exit challenge and forfeit?
            </h3>
            <span className="text-xs text-[var(--color-text-muted)]">
              Remaining session time: {formattedTime}
            </span>
          </div>
        </div>

        <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
          You are currently in an active timed challenge session. Leaving this workspace
          will end and forfeit your challenge attempt. Your code in the buffer will remain
          safely preserved in your local draft storage.
        </p>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" size="sm" onClick={cancelPendingNavigation} className="text-xs">
            Keep working
          </Button>
          <Button type="button" size="sm" onClick={confirmPendingNavigation} className="text-xs font-semibold">
            Exit and forfeit <X size={14} aria-hidden="true" />
          </Button>
        </div>
      </PixelCard>
    </div>
  );
}
