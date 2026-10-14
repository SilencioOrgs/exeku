import type { Metadata } from "next";
import { AppShell } from "@/components/app/app-shell";
import { ChallengeProvider } from "@/hooks/use-challenge-session";
import { ChallengeExitGuardModal } from "@/components/app/challenge-exit-guard-modal";

export const metadata: Metadata = {
  title: "Workspace — Exeku",
  description: "Offline-first programming environment and local profile dashboard.",
};

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ChallengeProvider>
      <AppShell>{children}</AppShell>
      <ChallengeExitGuardModal />
    </ChallengeProvider>
  );
}
