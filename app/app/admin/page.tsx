import type { Metadata } from "next";
import { AdminView } from "@/components/app/admin-view";

export const metadata: Metadata = {
  title: "Admin — Exeku",
  description: "Create problems and manage the development database.",
};

export default function AdminPage() {
  return <AdminView />;
}
