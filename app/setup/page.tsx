import type { Metadata } from "next";
import { OnboardingWizard } from "@/components/setup/onboarding-wizard";

export const metadata: Metadata = {
  title: "Profile Setup — Exeku",
  description: "Set up your local coding profile for offline Python, Java, C++, and C learning.",
};

export default function SetupPage() {
  return <OnboardingWizard />;
}
