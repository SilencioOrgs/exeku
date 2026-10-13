import React from "react";
import { cn } from "@/lib/utils";
import {
  DOT_ICONS_16,
  DOT_ICONS_32,
  type DotIconName,
} from "./dot-icon-paths";

export interface DotIconProps extends React.SVGAttributes<SVGSVGElement> {
  name: DotIconName;
  grid?: 16 | 32;
  size?: number;
  "aria-label"?: string;
}

export function DotIcon({
  name,
  grid,
  size = 16,
  className,
  style,
  "aria-label": ariaLabel,
  ...props
}: DotIconProps) {
  // Select 16x16 or 32x32 dot grid variant
  const resolvedGrid = grid ?? (size > 20 ? 32 : 16);
  const path = resolvedGrid === 32 ? DOT_ICONS_32[name] : DOT_ICONS_16[name];

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden={ariaLabel ? undefined : "true"}
      aria-label={ariaLabel}
      role={ariaLabel ? "img" : "presentation"}
      className={cn("inline-block shrink-0 select-none", className)}
      style={{
        imageRendering: "pixelated",
        ...style,
      }}
      {...props}
    >
      <path d={path} />
    </svg>
  );
}

export type { DotIconName };
