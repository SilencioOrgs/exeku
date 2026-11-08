import { cn } from "@/lib/utils";

const LABELS: Record<string, { label: string; tone: "easy" | "medium" | "hard" }> = {
  beginner: { label: "Easy", tone: "easy" },
  intermediate: { label: "Medium", tone: "medium" },
  advanced: { label: "Hard", tone: "hard" },
};

/** LeetCode-style Easy / Medium / Hard chip. Exeku stores beginner/intermediate/advanced. */
export function DifficultyBadge({ difficulty, className }: { difficulty: string; className?: string }) {
  const { label, tone } = LABELS[difficulty] ?? { label: difficulty, tone: "medium" as const };
  return (
    <span
      className={cn("inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-semibold", className)}
      style={{ color: `var(--color-${tone})`, backgroundColor: `var(--color-${tone}-bg)` }}
    >
      {label}
    </span>
  );
}

export function difficultyLabel(difficulty: string): string {
  return LABELS[difficulty]?.label ?? difficulty;
}
