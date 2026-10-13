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
        "bg-[#9E00FF] text-white border-2 border-[#C084FC] hover:bg-[#8B00E6] shadow-[3px_3px_0px_#000000]",
      secondary:
        "bg-[#1B0F36] text-[#F5F3FF] border-2 border-[#2E1A57] hover:border-[#9E00FF] hover:text-white shadow-[3px_3px_0px_#000000]",
      cyan:
        "bg-[#00F0FF] text-[#090514] font-bold border-2 border-[#FFFFFF] hover:bg-[#38BDF8] shadow-[3px_3px_0px_#000000]",
      pink:
        "bg-[#FF007A] text-white font-bold border-2 border-[#FFA1D4] hover:bg-[#E0006C] shadow-[3px_3px_0px_#000000]",
      ghost:
        "bg-transparent text-[#A79EC4] border-2 border-transparent hover:border-[#2E1A57] hover:text-white",
    };

    const baseStyles =
      "inline-flex items-center justify-center gap-2 uppercase select-none transition-all duration-75 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#090514] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50 disabled:pointer-events-none";

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
