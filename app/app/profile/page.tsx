import type { Metadata } from "next";
import { ProfileView } from "@/components/app/profile-view";

export const metadata: Metadata = {
  title: "Profile — Exeku",
  description: "Local coding profile and saved coding activity.",
};

export default function ProfilePage() {
  return <ProfileView />;
}
