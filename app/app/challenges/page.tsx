import type { Metadata } from "next";
import { ChallengesView } from "@/components/app/challenges-view";

export const metadata: Metadata = {
  title: "Challenges — Exeku",
  description: "Offline problem library, language tracks, and programming curriculum.",
};

export default function ChallengesPage() {
  return <ChallengesView />;
}
