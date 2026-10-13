import type { Metadata } from "next";
import { Suspense } from "react";
import { WorkspaceView } from "@/components/app/workspace-view";

export const metadata: Metadata = {
  title: "Workspace — Exeku",
  description: "Online programming practice sandbox and Monaco editor environment.",
};

export default function WorkspacePage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <div className="w-10 h-10 border-4 border-[#00F0FF] border-t-transparent animate-spin mb-4" />
          <span className="font-mono text-xs text-[#00F0FF] uppercase tracking-widest animate-pulse">
            INITIALIZING WORKSPACE...
          </span>
        </div>
      }
    >
      <WorkspaceView />
    </Suspense>
  );
}
