import type { Metadata } from "next";
import { Suspense } from "react";
import { WorkspaceView } from "@/components/app/workspace-view";

export const metadata: Metadata = {
  title: "Workspace — Exeku",
  description: "Write, run and submit code in Python 3, Java, C++ and C.",
};

export default function WorkspacePage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center gap-3 p-12 text-center text-sm text-[var(--color-text-muted)]">
          <div className="size-6 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-text-main)]" aria-hidden="true" />
          Loading workspace…
        </div>
      }
    >
      <WorkspaceView />
    </Suspense>
  );
}
