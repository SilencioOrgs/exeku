import React from "react";
import { cn } from "@/lib/utils";

export interface PixelAvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  avatarId: string;
  size?: number;
  className?: string;
}

import { AVATARS, DEFAULT_AVATAR_ID, type AvatarDefinition } from "@/lib/avatars";

export type AvatarMeta = AvatarDefinition;
export const AVATAR_METAS = AVATARS;
export { DEFAULT_AVATAR_ID, AVATARS };


/**
 * Pure SVG Pixel Art rendering using crisp coordinate rects.
 * 100% locally rendered, 0 external image requests.
 */
function renderAvatarSvg(avatarId: string) {
  switch (avatarId) {
    case "pixel-cat":
      return (
        <svg viewBox="0 0 16 16" className="w-full h-full" shapeRendering="crispEdges">
          {/* Ears */}
          <rect x="2" y="1" width="3" height="3" fill="#FF007A" />
          <rect x="11" y="1" width="3" height="3" fill="#FF007A" />
          <rect x="3" y="2" width="1" height="1" fill="#FFFFFF" />
          <rect x="12" y="2" width="1" height="1" fill="#FFFFFF" />
          {/* Head */}
          <rect x="2" y="4" width="12" height="9" fill="#2E1238" />
          <rect x="3" y="3" width="10" height="2" fill="#2E1238" />
          {/* Neon Face Mask */}
          <rect x="4" y="5" width="8" height="7" fill="#1C0A24" />
          {/* Eyes */}
          <rect x="4" y="7" width="2" height="2" fill="#00F0FF" />
          <rect x="10" y="7" width="2" height="2" fill="#00F0FF" />
          <rect x="5" y="7" width="1" height="1" fill="#FFFFFF" />
          <rect x="11" y="7" width="1" height="1" fill="#FFFFFF" />
          {/* Nose & Whiskers */}
          <rect x="7" y="9" width="2" height="1" fill="#FF007A" />
          <rect x="1" y="8" width="2" height="1" fill="#FF007A" />
          <rect x="1" y="10" width="2" height="1" fill="#FF007A" />
          <rect x="13" y="8" width="2" height="1" fill="#FF007A" />
          <rect x="13" y="10" width="2" height="1" fill="#FF007A" />
          {/* Collar */}
          <rect x="5" y="13" width="6" height="2" fill="#9E00FF" />
          <rect x="7" y="14" width="2" height="1" fill="#00FF9D" />
        </svg>
      );

    case "crt-terminal":
      return (
        <svg viewBox="0 0 16 16" className="w-full h-full" shapeRendering="crispEdges">
          {/* Monitor Casing */}
          <rect x="1" y="1" width="14" height="12" fill="#2A303C" />
          <rect x="2" y="2" width="12" height="10" fill="#1B1F27" />
          {/* Screen Bezel */}
          <rect x="3" y="3" width="10" height="8" fill="#0B1C13" />
          {/* Phosphor Grid Lines */}
          <rect x="4" y="4" width="8" height="6" fill="#052818" />
          {/* Prompt > _ */}
          <rect x="5" y="5" width="1" height="3" fill="#00FF9D" />
          <rect x="6" y="6" width="1" height="1" fill="#00FF9D" />
          <rect x="8" y="7" width="3" height="1" fill="#00FF9D" />
          {/* CRT Glare */}
          <rect x="10" y="4" width="1" height="1" fill="#A7F3D0" />
          {/* Stand */}
          <rect x="6" y="13" width="4" height="1" fill="#1B1F27" />
          <rect x="4" y="14" width="8" height="1" fill="#2A303C" />
        </svg>
      );

    case "matrix-mage":
      return (
        <svg viewBox="0 0 16 16" className="w-full h-full" shapeRendering="crispEdges">
          {/* Cowl / Hood */}
          <rect x="4" y="1" width="8" height="2" fill="#9E00FF" />
          <rect x="2" y="3" width="12" height="4" fill="#9E00FF" />
          <rect x="1" y="7" width="14" height="6" fill="#7900C7" />
          {/* Shadowed Face */}
          <rect x="4" y="5" width="8" height="5" fill="#090514" />
          {/* Glowing Eyes */}
          <rect x="5" y="7" width="2" height="1" fill="#00F0FF" />
          <rect x="9" y="7" width="2" height="1" fill="#00F0FF" />
          <rect x="5" y="8" width="1" height="1" fill="#9E00FF" />
          <rect x="10" y="8" width="1" height="1" fill="#9E00FF" />
          {/* Rune Gem */}
          <rect x="7" y="3" width="2" height="2" fill="#00F0FF" />
          {/* Robe Collar */}
          <rect x="3" y="13" width="10" height="2" fill="#4B007D" />
          <rect x="7" y="12" width="2" height="3" fill="#00FF9D" />
        </svg>
      );

    case "byte-skull":
      return (
        <svg viewBox="0 0 16 16" className="w-full h-full" shapeRendering="crispEdges">
          {/* Skull Cranium */}
          <rect x="4" y="1" width="8" height="2" fill="#E4DBFF" />
          <rect x="2" y="3" width="12" height="6" fill="#E4DBFF" />
          {/* Cyber Shades */}
          <rect x="1" y="5" width="14" height="3" fill="#00F0FF" />
          <rect x="2" y="5" width="12" height="2" fill="#090514" />
          <rect x="3" y="6" width="3" height="1" fill="#FF007A" />
          <rect x="10" y="6" width="3" height="1" fill="#FF007A" />
          {/* Nose Cavity */}
          <rect x="7" y="9" width="2" height="1" fill="#2E1A57" />
          {/* Teeth / Jaw */}
          <rect x="4" y="10" width="8" height="4" fill="#E4DBFF" />
          <rect x="5" y="11" width="1" height="3" fill="#2E1A57" />
          <rect x="7" y="11" width="2" height="3" fill="#2E1A57" />
          <rect x="10" y="11" width="1" height="3" fill="#2E1A57" />
          {/* Cyber Circuit Node */}
          <rect x="13" y="3" width="1" height="2" fill="#00FF9D" />
          <rect x="12" y="4" width="2" height="1" fill="#00FF9D" />
        </svg>
      );

    case "synth-scout":
      return (
        <svg viewBox="0 0 16 16" className="w-full h-full" shapeRendering="crispEdges">
          {/* Space Helmet Dome */}
          <rect x="4" y="1" width="8" height="2" fill="#F8FAFC" />
          <rect x="2" y="3" width="12" height="9" fill="#E2E8F0" />
          {/* Gold Reflective Visor */}
          <rect x="3" y="4" width="10" height="6" fill="#FFB800" />
          <rect x="4" y="5" width="8" height="4" fill="#D97706" />
          {/* Visor Glare */}
          <rect x="4" y="5" width="2" height="1" fill="#FEF08A" />
          <rect x="5" y="6" width="2" height="1" fill="#FEF08A" />
          {/* Helmet Collar & Rebreather */}
          <rect x="3" y="12" width="10" height="2" fill="#475569" />
          <rect x="6" y="11" width="4" height="3" fill="#0F172A" />
          <rect x="7" y="12" width="2" height="1" fill="#00F0FF" />
          <rect x="1" y="6" width="1" height="4" fill="#9E00FF" />
          <rect x="14" y="6" width="1" height="4" fill="#9E00FF" />
        </svg>
      );

    case "chip-core":
      return (
        <svg viewBox="0 0 16 16" className="w-full h-full" shapeRendering="crispEdges">
          {/* Chip Body */}
          <rect x="3" y="3" width="10" height="10" fill="#1E293B" />
          <rect x="4" y="4" width="8" height="8" fill="#0F172A" />
          {/* Silicon Core */}
          <rect x="6" y="6" width="4" height="4" fill="#00F0FF" />
          <rect x="7" y="7" width="2" height="2" fill="#FFFFFF" />
          {/* Traces */}
          <rect x="7" y="4" width="2" height="2" fill="#00FF9D" />
          <rect x="7" y="10" width="2" height="2" fill="#00FF9D" />
          <rect x="4" y="7" width="2" height="2" fill="#00FF9D" />
          <rect x="10" y="7" width="2" height="2" fill="#00FF9D" />
          {/* Pins */}
          <rect x="5" y="1" width="1" height="2" fill="#FFB800" />
          <rect x="7" y="1" width="2" height="2" fill="#FFB800" />
          <rect x="10" y="1" width="1" height="2" fill="#FFB800" />
          <rect x="5" y="13" width="1" height="2" fill="#FFB800" />
          <rect x="7" y="13" width="2" height="2" fill="#FFB800" />
          <rect x="10" y="13" width="1" height="2" fill="#FFB800" />
          <rect x="1" y="5" width="2" height="1" fill="#FFB800" />
          <rect x="1" y="7" width="2" height="2" fill="#FFB800" />
          <rect x="1" y="10" width="2" height="1" fill="#FFB800" />
          <rect x="13" y="5" width="2" height="1" fill="#FFB800" />
          <rect x="13" y="7" width="2" height="2" fill="#FFB800" />
          <rect x="13" y="10" width="2" height="1" fill="#FFB800" />
        </svg>
      );

    case "retro-ninja":
      return (
        <svg viewBox="0 0 16 16" className="w-full h-full" shapeRendering="crispEdges">
          {/* Mask / Cowl */}
          <rect x="3" y="1" width="10" height="3" fill="#18181B" />
          <rect x="2" y="3" width="12" height="10" fill="#18181B" />
          {/* Neon Headband */}
          <rect x="1" y="4" width="14" height="2" fill="#FF007A" />
          <rect x="14" y="5" width="2" height="3" fill="#FF007A" />
          {/* Eye Opening */}
          <rect x="4" y="7" width="8" height="2" fill="#3F3F46" />
          {/* Sharp Eyes */}
          <rect x="4" y="7" width="3" height="1" fill="#FFFFFF" />
          <rect x="9" y="7" width="3" height="1" fill="#FFFFFF" />
          <rect x="5" y="8" width="1" height="1" fill="#00F0FF" />
          <rect x="10" y="8" width="1" height="1" fill="#00F0FF" />
          {/* Face Cover */}
          <rect x="3" y="9" width="10" height="4" fill="#27272A" />
          {/* Shuriken Tie */}
          <rect x="7" y="13" width="2" height="2" fill="#A1A1AA" />
        </svg>
      );

    case "glitch-bot":
    default:
      return (
        <svg viewBox="0 0 16 16" className="w-full h-full" shapeRendering="crispEdges">
          {/* Antenna */}
          <rect x="7" y="1" width="2" height="2" fill="#FF007A" />
          <rect x="7" y="3" width="2" height="1" fill="#9E00FF" />
          {/* Head Shell */}
          <rect x="3" y="4" width="10" height="8" fill="#1E1238" />
          <rect x="2" y="5" width="12" height="6" fill="#2A184D" />
          {/* Ears */}
          <rect x="1" y="6" width="1" height="4" fill="#00F0FF" />
          <rect x="14" y="6" width="1" height="4" fill="#00F0FF" />
          {/* Visor Area */}
          <rect x="3" y="6" width="10" height="3" fill="#090514" />
          {/* Cyan Visor Beam */}
          <rect x="4" y="7" width="8" height="1" fill="#00F0FF" />
          <rect x="5" y="7" width="2" height="1" fill="#FFFFFF" />
          {/* Mouth Grille */}
          <rect x="5" y="10" width="6" height="1" fill="#00FF9D" />
          <rect x="6" y="10" width="1" height="1" fill="#090514" />
          <rect x="8" y="10" width="1" height="1" fill="#090514" />
          <rect x="10" y="10" width="1" height="1" fill="#090514" />
          {/* Neck Base */}
          <rect x="5" y="12" width="6" height="2" fill="#9E00FF" />
          <rect x="4" y="14" width="8" height="1" fill="#00F0FF" />
        </svg>
      );
  }
}

export function PixelAvatar({
  avatarId,
  size = 40,
  className,
  ...props
}: PixelAvatarProps) {
  const meta =
    AVATAR_METAS.find((m) => m.id === avatarId) ?? AVATAR_METAS[0];

  return (
    <div
      style={{
        width: size,
        height: size,
        backgroundColor: meta.bgColor,
        borderColor: meta.accentColor,
        imageRendering: "pixelated",
      }}
      className={cn(
        "inline-flex items-center justify-center border-2 p-1.5 shadow-[2px_2px_0px_#000000] select-none shrink-0",
        className
      )}
      role="img"
      aria-label={`${meta.name} - ${meta.role}`}
      {...props}
    >
      {renderAvatarSvg(meta.id)}
    </div>
  );
}
