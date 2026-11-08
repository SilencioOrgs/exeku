import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { CommandStation } from "@/components/app/command-station";
import { EventBanner } from "@/components/app/competition/event-banner";
import { getFeaturedEvent, isSampleData } from "@/lib/competition/repository";

export const metadata: Metadata = {
  title: "Dashboard — Exeku",
  description: "Offline programming workstation and local telemetry overview.",
};

async function FeaturedBanner() {
  await connection();
  const event = await getFeaturedEvent();
  return event ? <EventBanner event={event} sample={isSampleData} /> : null;
}

export default function AppPage() {
  return <CommandStation banner={<Suspense fallback={null}><FeaturedBanner /></Suspense>} />;
}
