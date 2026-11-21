import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { OrgsListSkeleton } from "@/components/app/page-skeletons";
import { RegisterOrgNote } from "@/components/app/orgs/register-org-note";
import { listOrgs } from "@/lib/orgs/repository";

export const metadata: Metadata = {
  title: "Organizations — Exeku",
  description: "School organizations on Exeku.",
};

async function OrgList() {
  await connection();
  const orgs = await listOrgs();
  if (orgs.length === 0) return <p className="profile-panel p-6 text-sm text-[var(--color-text-muted)]">No organizations yet.</p>;
  return (
    <ul className="space-y-3">
      {orgs.map((org) => (
        <li key={org.id}>
          <Link href={`/app/orgs/${org.id}`} className="profile-panel block p-5 transition-colors hover:border-[var(--color-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]">
            <h2 className="text-lg font-semibold">{org.name}</h2>
            <p className="text-sm text-[var(--color-text-muted)]">{org.schoolName} · {org.campusName} · {org.programName}</p>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">{org.memberCount} members</p>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function OrgsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Organizations</h1>
        <p className="text-sm text-[var(--color-text-muted)]">Join your school organization to enter its competitions.</p>
      </header>
      <Suspense fallback={<OrgsListSkeleton />}>
        <OrgList />
      </Suspense>
      <RegisterOrgNote />
    </div>
  );
}
