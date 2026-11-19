import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { AppShell } from "@/components/app/app-shell";
import { ChallengeProvider } from "@/hooks/use-challenge-session";
import { ChallengeExitGuardModal } from "@/components/app/challenge-exit-guard-modal";

export const metadata: Metadata = {
  title: "Workspace | Exeku",
  description: "Competitive programming workspace, sandbox judge, and tournament dashboard.",
};

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider signInUrl="/setup" signUpUrl="/setup">
      <ChallengeProvider>
        <AppShell>{children}</AppShell>
        <ChallengeExitGuardModal />
      </ChallengeProvider>
    </ClerkProvider>
  );
}
