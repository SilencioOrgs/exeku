import React from "react";
import { cn } from "@/lib/utils";

/** Backwards-compatible wrapper, now styled as a neutral shadcn-style button. */
export interface PixelButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "cyan" | "pink" | "ghost";
  size?: "xs" | "icon" | "sm" | "md" | "lg";
  href?: string;
}

export const PixelButton = React.forwardRef<HTMLButtonElement, PixelButtonProps>(
  ({ children, variant = "primary", size = "md", className, href, onClick, ...props }, ref) => {
    const sizes = {
      xs: "h-8 min-h-8 gap-1.5 px-2.5 text-xs",
      icon: "h-8 w-8 min-h-8 p-0",
      sm: "h-9 min-h-9 gap-1.5 px-3 text-xs",
      md: "h-10 min-h-10 gap-2 px-4 text-sm",
      lg: "h-11 min-h-11 gap-2 px-5 text-sm",
    };
    const variants = {
      primary: "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)] hover:bg-[var(--color-primary-hover)]",
      cyan: "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)] hover:bg-[var(--color-primary-hover)]",
      secondary: "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-main)] hover:bg-[var(--color-elevated)]",
      ghost: "border-transparent bg-transparent text-[var(--color-text-muted)] hover:bg-[var(--color-elevated)] hover:text-[var(--color-text-main)]",
      pink: "border-[var(--color-pink)] bg-[var(--color-pink)] text-white hover:opacity-90",
    };
    const styles = cn(
      "appearance-button inline-flex shrink-0 cursor-pointer items-center justify-center whitespace-nowrap rounded-lg border font-medium normal-case shadow-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)] disabled:pointer-events-none disabled:opacity-50",
      sizes[size], variants[variant], className,
    );
    if (href) return <a href={href} className={styles}>{children}</a>;
    return <button ref={ref} className={styles} onClick={onClick} {...props}>{children}</button>;
  }
);
PixelButton.displayName = "PixelButton";
