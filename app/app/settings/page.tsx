import type { Metadata } from "next";
import { SettingsView } from "@/components/app/settings-view";

export const metadata: Metadata = {
  title: "Settings — Exeku",
  description: "Local profile settings, IndexedDB storage inspection, and machine reset.",
};

export default function SettingsPage() {
  return <SettingsView />;
}
