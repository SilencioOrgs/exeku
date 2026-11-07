import { DotIcon } from "@/components/retro/dot-icon";
import { verdictInfo, isRealVerdict } from "@/lib/verdicts";
import { cn } from "@/lib/utils";

/** Green for pass, red for a real failure, neutral for judge/sandbox problems. The code and word always carry the meaning. */
export function VerdictBadge({ status, short = false, className }: { status: string | undefined | null; short?: boolean; className?: string }) {
  const { code, label, pass } = verdictInfo(status);
  return (
    <span
      title={label}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs font-medium",
        pass
          ? "border-[var(--color-mint)] bg-[color-mix(in_srgb,var(--color-mint)_12%,transparent)] text-[var(--color-mint)]"
          : isRealVerdict(status)
            ? "border-[var(--color-pink)] bg-[color-mix(in_srgb,var(--color-pink)_10%,transparent)] text-[var(--color-pink)]"
            : "border-[var(--color-border)] text-[var(--color-text-muted)]",
        className,
      )}
    >
      {!short && <DotIcon name={pass ? "circleCheck" : "circleClose"} size={12} aria-hidden="true" />}
      <span className="font-code">{code}</span>
      {!short && <span>{label}</span>}
      {short && <span className="sr-only">{label}</span>}
    </span>
  );
}
