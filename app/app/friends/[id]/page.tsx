import type { Metadata } from "next";
import { Suspense } from "react";
import { PublicProfileView } from "@/components/app/public-profile-view";
import { DetailPageSkeleton } from "@/components/app/page-skeletons";

export const metadata: Metadata = {
  title: "Student profile — Exeku",
  description: "A student's Exeku profile.",
};

type Params = Promise<{ id: string }>;

async function Profile({ params }: { params: Params }) {
  const { id } = await params;
  return <PublicProfileView userId={id} />;
}

export default function StudentProfilePage({ params }: { params: Params }) {
  return <Suspense fallback={<DetailPageSkeleton label="Loading profile…" />}><Profile params={params} /></Suspense>;
}
