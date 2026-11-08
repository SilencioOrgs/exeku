import Image from "next/image";
import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

/** The single E key, for spots too small for the full word. Decorative: give the surrounding element its own name. */
export function BrandLogo({ size = 28, className }: { size?: number; className?: string }) {
  return <Image src="/brand/exeku-logo.webp" alt="" width={size} height={size} className={className} />;
}

/** EXEKU on five keycaps, the logo wherever there is room for it. The keys type themselves in and press like real ones (.wm in globals.css). */
export function BrandWordmark({ height = 32, className }: { height?: number; className?: string }) {
  return (
    <span role="img" aria-label="Exeku" className={cn("wm", className)} style={{ width: Math.round(height * 4.518), height }}>
      {[0, 1, 2, 3, 4].map((i) => <span key={i} className="wm-key" style={{ "--i": i } as CSSProperties} />)}
    </span>
  );
}
