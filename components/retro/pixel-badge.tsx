import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/** Small neutral label. Legacy name kept; `variant="pink"` marks danger, everything else is neutral. */
export interface PixelBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "cyan" | "pink" | "mint" | "purple" | "muted";
  bracketed?: boolean;
}

export function PixelBadge({ children, variant = "default", bracketed: _bracketed, className, ...props }: PixelBadgeProps) {
  void _bracketed;
  return (
    <span
      className={cn(
        "ui-badge inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border border-[var(--color-border)] bg-[var(--color-elevated)] px-2 py-0.5 text-xs font-medium text-[var(--color-text-muted)]",
        variant === "pink" && "border-[var(--color-hard-bg)] bg-[var(--color-hard-bg)] text-[var(--color-hard)]",
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
