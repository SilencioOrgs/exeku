import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import type { Campus } from "@/types/account";
import type { LeaderboardEntry } from "@/types/competition";

export interface LeaderboardViewProps {
  entries: LeaderboardEntry[];
  campuses: Campus[];
  activeCampus?: Campus;
}

export function LeaderboardView({ entries, campuses, activeCampus }: LeaderboardViewProps) {
  const filters = [{ id: undefined, name: "Overall" }, ...campuses];
  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Leaderboard</h1>
        <p className="text-sm text-[var(--color-text-muted)]">{activeCampus ? activeCampus.name : "All campuses"}</p>
      </header>

      <nav aria-label="Leaderboard scope" className="flex flex-wrap gap-2">
        {filters.map((filter) => {
          const active = filter.id === activeCampus?.id;
          return (
            <Link key={filter.name} scroll={false} aria-current={active ? "page" : undefined}
              href={filter.id ? `/app/leaderboard?campus=${filter.id}` : "/app/leaderboard"}
              className={buttonVariants({ variant: active ? "default" : "outline" })}>
              {filter.name}
            </Link>
          );
        })}
      </nav>

      {entries.length === 0 ? (
        <p className="profile-panel p-6 text-sm text-[var(--color-text-muted)]">No results yet. Solve a problem to get on the board.</p>
      ) : (
        <div className="profile-panel overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-xs text-[var(--color-text-muted)]">
                <th scope="col" className="w-16 px-4 py-3 font-medium">Rank</th>
                <th scope="col" className="px-4 py-3 font-medium">Name</th>
                <th scope="col" className="hidden px-4 py-3 font-medium sm:table-cell">Campus</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Solved</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Points</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b border-[var(--color-border-subtle)] last:border-0">
                  <td className={`px-4 py-3 font-code tabular-nums ${entry.rank <= 3 ? "font-semibold text-[var(--color-primary-text)]" : ""}`}>{entry.rank}</td>
                  <td className="px-4 py-3 font-medium">{entry.name}</td>
                  <td className="hidden px-4 py-3 text-[var(--color-text-muted)] sm:table-cell">{entry.campusName}</td>
                  <td className="px-4 py-3 text-right font-code tabular-nums">{entry.solved}</td>
                  <td className="px-4 py-3 text-right font-code tabular-nums">{entry.points.toLocaleString("en-PH")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
