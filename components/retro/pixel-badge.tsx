import React from "react";
import { cn } from "@/lib/utils";

export interface PixelBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "cyan" | "pink" | "mint" | "purple" | "muted";
  bracketed?: boolean;
}

export function PixelBadge({
  children,
  variant = "default",
  bracketed = true,
  className,
  ...props
}: PixelBadgeProps) {
  const variantStyles = {
    default:
      "bg-[var(--color-elevated)] text-[var(--color-text-main)] border-[var(--color-border)]",
    cyan:
      "bg-[var(--color-accent)]/15 text-[var(--color-accent)] border-[var(--color-accent)]/50",
    pink:
      "bg-[var(--color-pink)]/15 text-[var(--color-pink)] border-[var(--color-pink)]/50",
    mint:
      "bg-[var(--color-mint)]/15 text-[var(--color-mint)] border-[var(--color-mint)]/50",
    purple:
      "bg-[var(--color-primary)]/15 text-[var(--color-primary-text)] border-[var(--color-primary)]/50",
    muted:
      "bg-[var(--color-surface)] text-[var(--color-text-muted)] border-[var(--color-border)]",
  };

  return (
    <span
      className={cn(
        "appearance-badge inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-mono tracking-wide border uppercase select-none [border-radius:var(--radius-btn)]",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {bracketed && <span className="opacity-60">[</span>}
      {children}
      {bracketed && <span className="opacity-60">]</span>}
    </span>
  );
}
