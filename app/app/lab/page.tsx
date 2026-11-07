import type { Metadata } from "next";
import { LabView } from "@/components/lab/lab-view";

export const metadata: Metadata = {
  title: "Hardware Lab — Exeku",
  description: "Simulate a simple Arduino circuit and preview a 3D-printable chassis for it.",
};

export default function LabPage() {
  return <LabView />;
}
