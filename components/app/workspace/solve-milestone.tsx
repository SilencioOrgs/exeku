import Image from "next/image";
import { AVATARS, unlocksAt } from "@/lib/avatars";
import type { SolveMilestone } from "@/lib/judge/judging-service";
import { milestoneStatus } from "@/lib/milestones";

export interface EventProgress { title: string; solved: number; total: number }

function Bar({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} className="skeuo-recess h-2.5 overflow-hidden rounded-full">
      <div className="milestone-fill h-full rounded-full" style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
    </div>
  );
}

export function SolveMilestoneCard({ milestone, event }: { milestone?: SolveMilestone; event: EventProgress | null }) {
  if (!milestone) return null;
  const { firstSolve, points, solved } = milestone;
  const { reached, next } = milestoneStatus(solved);
  const unlocked = firstSolve ? AVATARS.find((a) => unlocksAt(a.id) === solved) : undefined;
  const eventDone = event && event.solved >= event.total;

  return (
    <section aria-label="Milestone" className="skeuo-recess space-y-3 rounded-xl p-4">
      <div className="flex items-center gap-4">
        <Image src="/brand/exeku-logo.webp" alt="" width={64} height={64} className={firstSolve ? "milestone-key" : undefined} />
        <div className="min-w-0">
          <p className="font-semibold">{firstSolve ? (reached ? `Milestone: ${solved} ${solved === 1 ? "problem" : "problems"} solved` : "Problem solved") : "Solved again"}</p>
          <p className="text-sm text-[var(--color-text-muted)]">{firstSolve ? <><span className="font-code text-[var(--color-primary-text)]">+{points}</span> points and an E key on today&apos;s activity</> : "You already earned the points for this one."}</p>
          {unlocked && <p className="mt-0.5 text-xs text-[var(--color-primary-text)]">New avatar unlocked: {unlocked.name}</p>}
        </div>
      </div>
      {next && (
        <div className="space-y-1.5">
          <p className="flex justify-between text-xs text-[var(--color-text-muted)]"><span>Next milestone</span><span className="font-code">{solved}/{next}</span></p>
          <Bar label="Progress to the next milestone" value={solved} max={next} />
        </div>
      )}
      {event && (
        <div className="space-y-1.5">
          <p className="flex justify-between gap-3 text-xs text-[var(--color-text-muted)]"><span className="truncate">{eventDone ? `${event.title}: complete` : event.title}</span><span className="font-code">{event.solved}/{event.total}</span></p>
          <Bar label="Event progress" value={event.solved} max={event.total} />
        </div>
      )}
    </section>
  );
}
