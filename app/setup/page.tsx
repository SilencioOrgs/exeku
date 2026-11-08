import type { Metadata } from "next";
import { SignInCard } from "@/components/setup/sign-in-card";

export const metadata: Metadata = {
  title: "Sign in — Exeku",
  description: "Sign in to Exeku and start practicing Python, Java, C++, and C.",
};

export default function SetupPage() {
  return <SignInCard />;
}
