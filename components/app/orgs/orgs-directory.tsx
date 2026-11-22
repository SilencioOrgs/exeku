"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock3,
  Crown,
  GraduationCap,
  Loader2,
  Search,
  Send,
  Users,
  X,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useProfile } from "@/hooks/use-profile";
import { fetchOrgs, orgAction } from "@/lib/orgs/api";
import type { OrgSummary } from "@/types/org";
import { ApplyOrgDialog } from "./apply-org-dialog";

const ROLE_LABELS = { president: "President", officer: "Officer", member: "Member" };

export function OrgsDirectory({ initialOrgs }: { initialOrgs: OrgSummary[] }) {
  const { profile } = useProfile();
  const [orgs, setOrgs] = useState<OrgSummary[]>(initialOrgs);
  const [query, setQuery] = useState("");
  const [applyingOrg, setApplyingOrg] = useState<OrgSummary | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string>();
  const [error, setError] = useState<string>();

  const refresh = async () => {
    const res = await fetchOrgs();
    if (res.ok) setOrgs(res.data.orgs);
  };

  const handleCancel = async (org: OrgSummary) => {
    setCancellingId(org.id);
    setError(undefined);
    setNotice(undefined);
    try {
      const res = await orgAction(org.id, { action: "cancelApplication" });
      if (!res.ok) {
        setError(res.error ?? "Could not cancel application.");
        return;
      }
      setNotice(`Cancelled your pending application to ${org.name}.`);
      await refresh();
    } finally {
      setCancellingId(null);
    }
  };

  const q = query.trim().toLowerCase();
  const filtered = orgs.filter((o) => {
    if (!q) return true;
    return (
      o.name.toLowerCase().includes(q) ||
      o.schoolName.toLowerCase().includes(q) ||
      o.campusName.toLowerCase().includes(q) ||
      o.programName.toLowerCase().includes(q)
    );
  });

  const totalMembers = orgs.reduce((sum, o) => sum + o.memberCount, 0);
  const myMemberships = orgs.filter((o) => o.viewerRole).length;
  const myPending = orgs.filter((o) => !o.viewerRole && o.applicationStatus === "pending").length;
  const isStudent = profile?.userType === "student" || Boolean(profile?.account);

  return (
    <div className="space-y-6">
      {/* KPI strip */}
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="skeuo-panel p-4">
          <dt className="text-xs text-[var(--color-text-muted)]">Organizations</dt>
          <dd className="font-code mt-1 text-2xl font-semibold">{orgs.length}</dd>
        </div>
        <div className="skeuo-panel p-4">
          <dt className="text-xs text-[var(--color-text-muted)]">Active members</dt>
          <dd className="font-code mt-1 text-2xl font-semibold">{totalMembers}</dd>
        </div>
        <div className="skeuo-panel p-4">
          <dt className="text-xs text-[var(--color-text-muted)]">Joined</dt>
          <dd className="font-code mt-1 text-2xl font-semibold text-[var(--color-mint)]">{myMemberships}</dd>
        </div>
        <div className="skeuo-panel p-4">
          <dt className="text-xs text-[var(--color-text-muted)]">Pending requests</dt>
          <dd className="font-code mt-1 text-2xl font-semibold text-[var(--color-primary-text)]">{myPending}</dd>
        </div>
      </dl>

      {/* Search bar */}
      <div className="relative max-w-md">
        <Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[var(--color-text-muted)]" aria-hidden="true" />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search organization, school, campus, or program…"
          className="pl-9"
        />
      </div>

      {error && <p role="alert" className="skeuo-recess rounded-xl p-3 text-sm text-[var(--color-pink)]">{error}</p>}
      {notice && <p role="status" className="skeuo-recess rounded-xl p-3 text-sm text-[var(--color-mint)]">{notice}</p>}

      {filtered.length === 0 ? (
        <div className="skeuo-panel flex flex-col items-start gap-2 p-6 text-sm text-[var(--color-text-muted)]">
          <Building2 size={20} className="text-[var(--color-primary-text)]" aria-hidden="true" />
          <p>{orgs.length === 0 ? "No organizations registered yet." : "No organizations match your search."}</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((org) => {
            const isMember = Boolean(org.viewerRole);
            const isPending = !isMember && org.applicationStatus === "pending";
            const isRejected = !isMember && org.applicationStatus === "rejected";
            const isCancelling = cancellingId === org.id;

            return (
              <article
                key={org.id}
                className="skeuo-panel flex flex-col justify-between gap-4 p-5 transition-colors hover:border-[var(--color-primary-edge)]"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 space-y-1">
                      <h2 className="truncate text-lg font-semibold text-[var(--color-text-main)]">{org.name}</h2>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {org.schoolName} · {org.campusName}
                      </p>
                    </div>

                    {org.viewerRole ? (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-[var(--color-easy-bg)] px-2 py-0.5 font-code text-xs text-[var(--color-mint)]">
                        <CheckCircle2 size={12} aria-hidden="true" /> {ROLE_LABELS[org.viewerRole]}
                      </span>
                    ) : isPending ? (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-[var(--color-medium-bg)] px-2 py-0.5 font-code text-xs text-[var(--color-primary-text)]">
                        <Clock3 size={12} aria-hidden="true" /> Pending
                      </span>
                    ) : isRejected ? (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-[var(--color-hard-bg)] px-2 py-0.5 font-code text-xs text-[var(--color-pink)]">
                        Declined
                      </span>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="skeuo-well inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1">
                      <Users size={12} className="text-[var(--color-primary-text)]" aria-hidden="true" />
                      <span className="font-code text-[var(--color-text-main)]">{org.memberCount}</span>
                      <span className="text-[var(--color-text-muted)]">{org.memberCount === 1 ? "member" : "members"}</span>
                    </span>
                    <span className="skeuo-well rounded-md border px-2.5 py-1 font-code text-[var(--color-text-muted)]">
                      {org.programName}
                    </span>
                  </div>

                  {(org.presidentName || org.adviserName) && (
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--color-text-muted)]">
                      {org.presidentName && (
                        <span className="inline-flex items-center gap-1">
                          <Crown size={12} className="text-[var(--color-primary-text)]" aria-hidden="true" />
                          President: <strong className="font-medium text-[var(--color-text-main)]">{org.presidentName}</strong>
                        </span>
                      )}
                      {org.adviserName && (
                        <span className="inline-flex items-center gap-1">
                          <GraduationCap size={12} className="text-[var(--color-mint)]" aria-hidden="true" />
                          Adviser: <strong className="font-medium text-[var(--color-text-main)]">{org.adviserName}</strong>
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--color-border)] pt-3">
                  {isMember ? (
                    <span className="text-xs text-[var(--color-text-muted)]">Active membership</span>
                  ) : isPending ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isCancelling}
                      onClick={() => void handleCancel(org)}
                    >
                      {isCancelling ? (
                        <>
                          <Loader2 size={13} className="animate-spin" aria-hidden="true" /> Cancelling…
                        </>
                      ) : (
                        <>
                          <X size={13} aria-hidden="true" /> Cancel request
                        </>
                      )}
                    </Button>
                  ) : isRejected ? (
                    <span className="text-xs text-[var(--color-text-muted)]">Contact an officer to reapply</span>
                  ) : isStudent ? (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        setError(undefined);
                        setNotice(undefined);
                        setApplyingOrg(org);
                      }}
                    >
                      <Send size={13} aria-hidden="true" /> Apply to join
                    </Button>
                  ) : (
                    <Link href="/app/profile" className={buttonVariants({ variant: "outline", size: "sm" })}>
                      Add school email
                    </Link>
                  )}

                  <Link href={`/app/orgs/${org.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                    View details <ArrowRight size={13} aria-hidden="true" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <ApplyOrgDialog
        key={applyingOrg?.id ?? "closed"}
        org={applyingOrg}
        defaultProgram={profile?.account?.school.program}
        onClose={() => setApplyingOrg(null)}
        onApplied={() => {
          setNotice(`Application sent to ${applyingOrg?.name ?? "organization"}.`);
          void refresh();
        }}
      />
    </div>
  );
}
