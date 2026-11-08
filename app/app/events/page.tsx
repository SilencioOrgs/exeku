import type { Metadata } from "next";
import { EventsView } from "@/components/app/events/events-view";

export const metadata: Metadata = {
  title: "Events — Exeku",
  description: "Upcoming programming competitions.",
};

export default function EventsPage() {
  return <EventsView />;
}
