import React from "react";
import { cn } from "@/lib/utils";

export interface PixelBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "cyan" | "pink" | "mint" | "purple" | "muted";
  bracketed?: boolean;
}

export function PixelBadge({ children, variant = "default", bracketed: _bracketed, className, ...props }: PixelBadgeProps) {
  void _bracketed;
  return <span className={cn(
    "appearance-badge inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium normal-case tracking-normal",
    "border-[var(--color-border)] bg-[var(--color-elevated)] text-[var(--color-text-muted)]",
    variant === "pink" && "text-[var(--color-pink)]",
    variant === "mint" && "text-[var(--color-mint)]",
    className,
  )} {...props}>{children}</span>;
}
