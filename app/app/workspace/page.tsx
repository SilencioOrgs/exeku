import type { Metadata } from "next";
import { WorkspaceView } from "@/components/app/workspace-view";

export const metadata: Metadata = {
  title: "Workspace — Exeku",
  description: "Offline code sandbox and local Monaco editor scratchpad.",
};

export default function WorkspacePage() {
  return <WorkspaceView />;
}
