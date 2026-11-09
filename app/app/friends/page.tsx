import type { Metadata } from "next";
import { FriendsView } from "@/components/app/friends-view";

export const metadata: Metadata = {
  title: "Friends — Exeku",
  description: "Find classmates and see who you know in common.",
};

export default function FriendsPage() {
  return <FriendsView />;
}
