import { BrandWordmark } from "@/components/brand-logo";
import { cn } from "@/lib/utils";

/** The one loading state: the EXEKU keys press in turn (.wm-loader in globals.css). */
export function BrandLoader({ label = "Loading…", height = 32, className }: { label?: string; height?: number; className?: string }) {
  return (
    <span role="status" className={cn("flex flex-col items-center justify-center gap-3 p-10 text-center text-sm text-[var(--color-text-muted)]", className)}>
      <BrandWordmark height={height} className="wm-loader" />
      <span>{label}</span>
    </span>
  );
}
