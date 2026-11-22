import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { connection } from "next/server";
import { Suspense } from "react";
import { OrgsListSkeleton } from "@/components/app/page-skeletons";
import { OrgsDirectory } from "@/components/app/orgs/orgs-directory";
import { RegisterOrgNote } from "@/components/app/orgs/register-org-note";
import { listOrgs } from "@/lib/orgs/repository";

export const metadata: Metadata = {
  title: "Organizations — Exeku",
  description: "School organizations on Exeku.",
};

async function OrgList() {
  await connection();
  const { userId } = await auth();
  const orgs = await listOrgs(undefined, userId ?? undefined);
  return <OrgsDirectory initialOrgs={orgs} />;
}

export default function OrgsPage() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Organizations</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          Join your campus organization to compete in official school events and team tournaments.
        </p>
      </header>
      <Suspense fallback={<OrgsListSkeleton />}>
        <OrgList />
      </Suspense>
      <RegisterOrgNote />
    </div>
  );
}
