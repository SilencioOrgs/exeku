import { DotIcon } from "@/components/retro/dot-icon";
import { verdictInfo } from "@/lib/verdicts";
import { cn } from "@/lib/utils";

/** Pass is a filled badge, anything else is outlined. The word carries the meaning, not color. */
export function VerdictBadge({ status, short = false, className }: { status: string | undefined | null; short?: boolean; className?: string }) {
  const { code, label, pass } = verdictInfo(status);
  return (
    <span
      title={label}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs font-medium",
        pass
          ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
          : "border-[var(--color-text-main)] text-[var(--color-text-main)]",
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
