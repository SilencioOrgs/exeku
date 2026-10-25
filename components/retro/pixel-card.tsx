import React from "react";
import { cn } from "@/lib/utils";

export interface PixelCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated" | "cyan" | "pink" | "purple";
  cornerMarks?: boolean;
}

/** Legacy name retained to avoid rewriting functionality; visuals are neutral. */
export function PixelCard({ children, variant = "default", cornerMarks: _cornerMarks, className, ...props }: PixelCardProps) {
  void _cornerMarks;
  return <div className={cn(
    "appearance-card relative rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-[var(--panel-padding)] shadow-none transition-colors",
    variant === "elevated" && "bg-[var(--color-surface)]",
    className,
  )} {...props}>{children}</div>;
}
