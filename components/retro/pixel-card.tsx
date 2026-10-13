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
    default: "bg-[#120A24] border-2 border-[#2E1A57]",
    elevated: "bg-[#1B0F36] border-2 border-[#3D2275] shadow-[4px_4px_0px_#000000]",
    cyan: "bg-[#120A24] border-2 border-[#00F0FF]/40 shadow-[4px_4px_0px_#000000,0_0_15px_rgba(0,240,255,0.1)]",
    pink: "bg-[#120A24] border-2 border-[#FF007A]/40 shadow-[4px_4px_0px_#000000,0_0_15px_rgba(255,0,122,0.1)]",
    purple: "bg-[#120A24] border-2 border-[#9E00FF]/50 shadow-[4px_4px_0px_#000000,0_0_18px_rgba(158,0,255,0.15)]",
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
          <span className="absolute -top-[5px] -left-[5px] w-2 h-2 border-t-2 border-l-2 border-[#00F0FF] pointer-events-none" />
          <span className="absolute -top-[5px] -right-[5px] w-2 h-2 border-t-2 border-r-2 border-[#00F0FF] pointer-events-none" />
          <span className="absolute -bottom-[5px] -left-[5px] w-2 h-2 border-b-2 border-l-2 border-[#00F0FF] pointer-events-none" />
          <span className="absolute -bottom-[5px] -right-[5px] w-2 h-2 border-b-2 border-r-2 border-[#00F0FF] pointer-events-none" />
        </>
      )}
      {children}
    </div>
  );
}
