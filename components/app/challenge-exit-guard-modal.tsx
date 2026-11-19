"use client";

import { X } from "lucide-react";

import React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useChallengeSession } from "@/hooks/use-challenge-session";

export function ChallengeExitGuardModal() {
  const {
    navigationPendingHref,
    formattedTime,
    cancelPendingNavigation,
    confirmPendingNavigation,
  } = useChallengeSession();

  return (
    <Dialog open={Boolean(navigationPendingHref)} onOpenChange={(open) => { if (!open) cancelPendingNavigation(); }}>
      <DialogContent showCloseButton={false} className="border-[var(--color-pink)] sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-[var(--color-pink)] bg-[var(--color-canvas)] text-xl font-bold text-[var(--color-pink)]">
              !
            </div>
            <div>
              <DialogTitle>Exit challenge and forfeit?</DialogTitle>
              <span className="font-code text-xs text-[var(--color-text-muted)]">
                Remaining session time: {formattedTime}
              </span>
            </div>
          </div>
          <DialogDescription className="pt-2 text-xs leading-relaxed">
            You are currently in an active timed challenge session. Leaving this workspace
            will end and forfeit your challenge attempt. Your code in the buffer will remain
            safely preserved in your local draft storage.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" size="sm" onClick={cancelPendingNavigation} className="text-xs">
            Keep working
          </Button>
          <Button type="button" variant="destructive" size="sm" onClick={confirmPendingNavigation} className="text-xs font-semibold">
            Exit and forfeit <X size={14} aria-hidden="true" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
