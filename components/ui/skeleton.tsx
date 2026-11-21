import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "animate-pulse rounded-md bg-[var(--color-elevated)] motion-reduce:animate-none",
        className,
      )}
    />
  );
}
