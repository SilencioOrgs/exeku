import React from "react";
import { cn } from "@/lib/utils";
import { AVATARS, DEFAULT_AVATAR_ID, type AvatarDefinition } from "@/lib/avatars";

export interface PixelAvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  avatarId: string;
  size?: number;
  className?: string;
}
export type AvatarMeta = AvatarDefinition;
export const AVATAR_METAS = AVATARS;
export { DEFAULT_AVATAR_ID, AVATARS };

/** Keep stored avatar IDs while moving the presentation to quiet initial avatars. */
export function PixelAvatar({ avatarId, size = 40, className, style, ...props }: PixelAvatarProps) {
  const letters = avatarId.split("-").map((word) => word.slice(0, 1)).join("").slice(0, 2).toUpperCase() || "EX";
  return <div role="img" aria-label={`Avatar ${avatarId.replaceAll("-", " ")}`}
    className={cn("inline-flex shrink-0 select-none items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-elevated)] font-semibold text-[var(--color-text-main)] shadow-none", className)}
    style={{ width: size, height: size, fontSize: Math.max(11, Math.round(size * .28)), ...style }} {...props}>
    {letters}
  </div>;
}
