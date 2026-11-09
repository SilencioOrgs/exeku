import type { Metadata } from "next";
import { Suspense } from "react";
import { BrandLoader } from "@/components/brand-loader";
import { OrgView } from "@/components/app/orgs/org-view";

export const metadata: Metadata = { title: "Organization — Exeku" };

type Params = Promise<{ id: string }>;

async function Org({ params }: { params: Params }) {
  const { id } = await params;
  return <OrgView orgId={id} />;
}

export default function OrgPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<BrandLoader label="Loading organization…" />}>
      <Org params={params} />
    </Suspense>
  );
}
