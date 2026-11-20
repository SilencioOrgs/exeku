import type { Metadata } from "next";
import { Suspense } from "react";
import { BrandLoader } from "@/components/brand-loader";
import { ClassDetailView } from "@/components/app/classes/class-detail-view";

export const metadata: Metadata = { title: "Class — Exeku" };

type Params = Promise<{ id: string }>;

async function ClassContent({ params }: { params: Params }) {
  const { id } = await params;
  return <ClassDetailView classId={id} />;
}

export default function ClassDetailPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<BrandLoader label="Loading class…" />}>
      <ClassContent params={params} />
    </Suspense>
  );
}
