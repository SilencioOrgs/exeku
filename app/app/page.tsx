import type { Metadata } from "next";
import { CommandStation } from "@/components/app/command-station";

export const metadata: Metadata = {
  title: "Dashboard — Exeku",
  description: "Offline programming workstation and local telemetry overview.",
};

export default function AppPage() {
  return <CommandStation />;
}
