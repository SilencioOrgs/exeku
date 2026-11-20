import type { Metadata } from "next";
import { ClassesView } from "@/components/app/classes/classes-view";

export const metadata: Metadata = {
  title: "Classes — Exeku",
  description: "Join classes by invite code, organize student groups, and solve assigned problems.",
};

export default function ClassesPage() {
  return <ClassesView />;
}
