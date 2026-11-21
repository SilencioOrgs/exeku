import type { Metadata } from "next";
import { Suspense } from "react";
import { DetailPageSkeleton } from "@/components/app/page-skeletons";
import { ClassDetailView } from "@/components/app/classes/class-detail-view";

export const metadata: Metadata = { title: "Class — Exeku" };

type Params = Promise<{ id: string }>;

async function ClassContent({ params }: { params: Params }) {
  const { id } = await params;
  return <ClassDetailView classId={id} />;
}

export default function ClassDetailPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<DetailPageSkeleton label="Loading class…" maxWidth="max-w-6xl" />}>
      <ClassContent params={params} />
    </Suspense>
  );
}
