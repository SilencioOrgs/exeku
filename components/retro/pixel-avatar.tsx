import React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { BORDER_SCALE, borderSrc } from "@/lib/avatar-borders";
import { AVATARS, DEFAULT_AVATAR_ID, getAvatar, type AvatarDefinition } from "@/lib/avatars";

export interface PixelAvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  avatarId: string;
  borderId?: string;
  size?: number;
  className?: string;
}
export type AvatarMeta = AvatarDefinition;
export const AVATAR_METAS = AVATARS;
export { DEFAULT_AVATAR_ID, AVATARS };

/** The chosen ninja in a circle, with its optional frame drawn over the edge. */
export function PixelAvatar({ avatarId, borderId, size = 40, className, style, ...props }: PixelAvatarProps) {
  const avatar = getAvatar(avatarId);
  const frame = borderSrc(borderId);
  const frameSize = Math.round(size * BORDER_SCALE);
  return <div role="img" aria-label={`Avatar ${avatar.name}`}
    className={cn("relative inline-block shrink-0 select-none rounded-full border border-[var(--color-border)] bg-[var(--color-elevated)]", className)}
    style={{ width: size, height: size, ...style }} {...props}>
    <Image src={`/avatars/${avatar.id}.webp`} alt="" width={size} height={size} className="size-full rounded-full object-contain" />
    {frame && <Image src={frame} alt="" width={frameSize} height={frameSize} className="pointer-events-none absolute top-1/2 left-1/2 max-w-none -translate-x-1/2 -translate-y-1/2" />}
  </div>;
}
