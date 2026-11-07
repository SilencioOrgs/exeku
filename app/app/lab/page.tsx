import type { Metadata } from "next";
import { LabView } from "@/components/lab/lab-view";

export const metadata: Metadata = {
  title: "Hardware Lab — Exeku",
  description: "Simulate a simple Arduino circuit and see it become a finished, 3D-printable product.",
};

export default function LabPage() {
  return <LabView />;
}
