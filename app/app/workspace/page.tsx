import type { Metadata } from "next";
import { Suspense } from "react";
import { BrandLoader } from "@/components/brand-loader";
import { WorkspaceView } from "@/components/app/workspace-view";

export const metadata: Metadata = {
  title: "Workspace — Exeku",
  description: "Write, run and submit code in Python 3, Java, C++ and C.",
};

export default function WorkspacePage() {
  return (
    <Suspense
      fallback={<BrandLoader label="Loading workspace…" />}
    >
      <WorkspaceView />
    </Suspense>
  );
}
