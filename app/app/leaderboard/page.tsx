import type { Metadata } from "next";
import { Suspense } from "react";
import { LeaderboardView } from "@/components/app/competition/leaderboard-view";
import { getCampuses, getLeaderboard, isSampleData } from "@/lib/competition/repository";

export const metadata: Metadata = {
  title: "Leaderboard — Exeku",
  description: "Overall and campus programming leaderboards.",
};

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

async function Leaderboard({ searchParams }: { searchParams: SearchParams }) {
  const { campus } = await searchParams;
  const campuses = await getCampuses();
  const activeCampus = campuses.find((c) => c.id === campus);
  const entries = await getLeaderboard(activeCampus?.id);
  return <LeaderboardView entries={entries} campuses={campuses} activeCampus={activeCampus} sample={isSampleData} />;
}

export default function LeaderboardPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<p role="status" className="p-8 text-sm text-[var(--color-text-muted)]">Loading leaderboard…</p>}>
      <Leaderboard searchParams={searchParams} />
    </Suspense>
  );
}
