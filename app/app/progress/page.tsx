import type { Metadata } from "next";
import { ProgressView } from "@/components/app/progress-view";

export const metadata: Metadata = {
  title: "Progress — Exeku",
  description: "Skill blueprint, draft inventory, and verified local analytics.",
};

export default function ProgressPage() {
  return <ProgressView />;
}
