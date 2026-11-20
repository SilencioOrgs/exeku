"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";

export default function AppErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[exeku] App route error:", error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg items-center justify-center p-6">
      <div className="skeuo-panel w-full space-y-4 p-6 text-center">
        <div className="mx-auto grid size-11 place-items-center rounded-xl bg-[var(--color-hard-bg)] text-[var(--color-pink)]">
          <AlertTriangle size={20} aria-hidden="true" />
        </div>
        <div className="space-y-1">
          <h1 className="text-lg font-semibold">Something went wrong</h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            We could not load this page right now. Try again, or head back to your workspace.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2 pt-1">
          <Button type="button" onClick={reset}>
            <RefreshCw size={14} aria-hidden="true" /> Try again
          </Button>
          <Link href="/app/workspace" className={buttonVariants({ variant: "outline" })}>
            Back to workspace
          </Link>
        </div>
      </div>
    </div>
  );
}
