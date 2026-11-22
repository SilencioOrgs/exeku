"use client";

import { useState, type FormEvent } from "react";
import { Building2, Crown, GraduationCap, Loader2, Send } from "lucide-react";
import { TextField } from "@/components/app/school/field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { orgAction } from "@/lib/orgs/api";
import type { OrgSummary } from "@/types/org";

export function ApplyOrgDialog({
  org,
  defaultProgram,
  onClose,
  onApplied,
}: {
  org: OrgSummary | null;
  defaultProgram?: string;
  onClose: () => void;
  onApplied: () => void;
}) {
  const [program, setProgram] = useState(defaultProgram ?? org?.programName ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!org || submitting) return;
    setSubmitting(true);
    setError(undefined);
    try {
      const res = await orgAction(org.id, { action: "apply", program: program.trim() || undefined });
      if (!res.ok) {
        setError(res.error ?? "Could not submit your application. Try again.");
        return;
      }
      onApplied();
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={org !== null}
      onOpenChange={(open) => {
        if (!open && !submitting) {
          setError(undefined);
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        {org && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 size={18} className="text-[var(--color-primary-text)]" aria-hidden="true" />
                Apply to {org.name}
              </DialogTitle>
              <DialogDescription>
                Your membership request will be reviewed by an officer or admin. Once accepted, you can enter {org.name} competitions.
              </DialogDescription>
            </DialogHeader>

            <div className="skeuo-well space-y-2 rounded-xl border p-3.5 text-xs">
              <p className="font-medium text-[var(--color-text-main)]">
                {org.schoolName} · {org.campusName}
              </p>
              <div className="flex flex-wrap gap-2 text-[var(--color-text-muted)]">
                <span>Program: <strong className="text-[var(--color-text-main)]">{org.programName}</strong></span>
                {org.presidentName && (
                  <span className="inline-flex items-center gap-1">
                    <Crown size={12} className="text-[var(--color-primary-text)]" aria-hidden="true" />
                    {org.presidentName}
                  </span>
                )}
                {org.adviserName && (
                  <span className="inline-flex items-center gap-1">
                    <GraduationCap size={12} className="text-[var(--color-mint)]" aria-hidden="true" />
                    {org.adviserName}
                  </span>
                )}
              </div>
            </div>

            {error && (
              <p role="alert" className="skeuo-recess rounded-xl p-3 text-xs text-[var(--color-pink)]">
                {error}
              </p>
            )}

            <TextField
              id="apply-org-program"
              label="Your program / course"
              placeholder={org.programName || "e.g. BSCPE"}
              value={program}
              onChange={(e) => setProgram(e.target.value)}
              disabled={submitting}
            />

            <DialogFooter>
              <Button type="button" variant="outline" disabled={submitting} onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                    Submitting application…
                  </>
                ) : (
                  <>
                    <Send size={14} aria-hidden="true" />
                    Submit application
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
