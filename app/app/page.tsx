import type { Metadata } from "next";
import { AppWelcome } from "@/components/app/app-welcome";

export const metadata: Metadata = {
  title: "Workspace — Exeku",
  description: "Offline programming workspace and local profile hub.",
};

export default function AppPage() {
  return <AppWelcome />;
}
