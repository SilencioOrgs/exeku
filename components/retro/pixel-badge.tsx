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
    default: "bg-[#1B0F36] text-[#F5F3FF] border-[#2E1A57]",
    cyan: "bg-[#091E2A] text-[#00F0FF] border-[#00F0FF]/40 shadow-[0_0_8px_rgba(0,240,255,0.15)]",
    pink: "bg-[#290B1E] text-[#FF007A] border-[#FF007A]/40 shadow-[0_0_8px_rgba(255,0,122,0.15)]",
    mint: "bg-[#092418] text-[#00FF9D] border-[#00FF9D]/40 shadow-[0_0_8px_rgba(0,255,157,0.15)]",
    purple: "bg-[#1B0F36] text-[#C084FC] border-[#9E00FF]/50 shadow-[0_0_8px_rgba(158,0,255,0.15)]",
    muted: "bg-[#120A24] text-[#A79EC4] border-[#2E1A57]",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-mono tracking-wide border uppercase select-none",
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
