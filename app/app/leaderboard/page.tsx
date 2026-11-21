import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { LeaderboardSkeleton } from "@/components/app/page-skeletons";
import { LeaderboardView } from "@/components/app/competition/leaderboard-view";
import { getViewer } from "@/lib/auth/viewer";
import { getCampuses, getLeaderboard } from "@/lib/competition/repository";

export const metadata: Metadata = {
  title: "Leaderboard — Exeku",
  description: "Overall and campus programming leaderboards.",
};

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

async function Leaderboard({ searchParams }: { searchParams: SearchParams }) {
  await connection();
  const [viewer, { campus }, campuses] = await Promise.all([getViewer(), searchParams, getCampuses()]);
  if (!viewer) redirect("/setup");
  const activeCampus = campuses.find((c) => c.id === campus);
  const entries = await getLeaderboard(activeCampus?.id);
  return <LeaderboardView entries={entries} campuses={campuses} activeCampus={activeCampus} />;
}

export default function LeaderboardPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<LeaderboardSkeleton />}>
      <Leaderboard searchParams={searchParams} />
    </Suspense>
  );
}
