import Image from "next/image";

/** The Blender-rendered Exeku logo. Decorative: every use sits beside the word "exeku". */
export function BrandLogo({ size = 28, className }: { size?: number; className?: string }) {
  return <Image src="/brand/exeku-logo.webp" alt="" width={size} height={size} className={className} />;
}
