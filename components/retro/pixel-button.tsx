import React from "react";
import { cn } from "@/lib/utils";

export interface PixelButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "cyan" | "pink" | "ghost";
  size?: "sm" | "md" | "lg";
  href?: string;
}

export const PixelButton = React.forwardRef<HTMLButtonElement, PixelButtonProps>(
  (
    {
      children,
      variant = "primary",
      size = "md",
      className,
      href,
      onClick,
      ...props
    },
    ref
  ) => {
    const sizeStyles = {
      sm: "px-3 py-1.5 text-xs font-mono",
      md: "px-5 py-2.5 text-sm font-mono tracking-wider",
      lg: "px-7 py-3.5 text-base font-mono tracking-wider",
    };

    const variantStyles = {
      primary:
        "bg-[var(--color-primary)] text-[var(--color-primary-foreground)] border-2 border-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] [box-shadow:var(--shadow-btn)]",
      secondary:
        "bg-[var(--color-elevated)] text-[var(--color-text-main)] border-2 border-[var(--color-border)] hover:border-[var(--color-primary)] hover:text-[var(--color-text-main)] [box-shadow:var(--shadow-btn)]",
      cyan:
        "bg-[var(--color-accent)] text-[var(--color-accent-foreground)] font-bold border-2 border-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] [box-shadow:var(--shadow-btn)]",
      pink:
        "bg-[var(--color-pink)] text-[var(--color-danger-foreground)] font-bold border-2 border-[var(--color-pink)] hover:opacity-90 [box-shadow:var(--shadow-btn)]",
      ghost:
        "bg-transparent text-[var(--color-text-muted)] border-2 border-transparent hover:border-[var(--color-border)] hover:text-[var(--color-text-main)]",
    };

    const baseStyles =
      "appearance-button min-h-11 inline-flex items-center justify-center gap-2 uppercase select-none transition-all duration-75 cursor-pointer outline-none [border-radius:var(--radius-btn)] focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-canvas)] active:translate-x-[1px] active:translate-y-[1px] disabled:opacity-50 disabled:pointer-events-none";

    if (href) {
      return (
        <a
          href={href}
          className={cn(baseStyles, sizeStyles[size], variantStyles[variant], className)}
        >
          {children}
        </a>
      );
    }

    return (
      <button
        ref={ref}
        className={cn(baseStyles, sizeStyles[size], variantStyles[variant], className)}
        onClick={onClick}
        {...props}
      >
        {children}
      </button>
    );
  }
);

PixelButton.displayName = "PixelButton";
