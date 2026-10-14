import React from "react";
import { cn } from "@/lib/utils";

export interface PixelCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated" | "cyan" | "pink" | "purple";
  cornerMarks?: boolean;
}

export function PixelCard({
  children,
  variant = "default",
  cornerMarks = true,
  className,
  ...props
}: PixelCardProps) {
  const variantStyles = {
    default:
      "bg-[var(--color-surface)] border-2 border-[var(--color-border)] [border-radius:var(--radius-card)] [box-shadow:var(--shadow-card)]",
    elevated:
      "bg-[var(--color-elevated)] border-2 border-[var(--color-border)] [border-radius:var(--radius-card)] [box-shadow:var(--shadow-card)]",
    cyan:
      "bg-[var(--color-surface)] border-2 border-[var(--color-accent)]/50 [border-radius:var(--radius-card)] [box-shadow:var(--shadow-card)]",
    pink:
      "bg-[var(--color-surface)] border-2 border-[var(--color-pink)]/50 [border-radius:var(--radius-card)] [box-shadow:var(--shadow-card)]",
    purple:
      "bg-[var(--color-surface)] border-2 border-[var(--color-primary)]/50 [border-radius:var(--radius-card)] [box-shadow:var(--shadow-card)]",
  };

  return (
    <div
      className={cn(
        "relative p-6 transition-colors duration-150",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {cornerMarks && (
        <>
          <span className="pixel-corner-mark absolute -top-[5px] -left-[5px] w-2 h-2 border-t-2 border-l-2 border-[var(--color-accent)] pointer-events-none" />
          <span className="pixel-corner-mark absolute -top-[5px] -right-[5px] w-2 h-2 border-t-2 border-r-2 border-[var(--color-accent)] pointer-events-none" />
          <span className="pixel-corner-mark absolute -bottom-[5px] -left-[5px] w-2 h-2 border-b-2 border-l-2 border-[var(--color-accent)] pointer-events-none" />
          <span className="pixel-corner-mark absolute -bottom-[5px] -right-[5px] w-2 h-2 border-b-2 border-r-2 border-[var(--color-accent)] pointer-events-none" />
        </>
      )}
      {children}
    </div>
  );
}
