import type { Metadata } from "next";
import { Suspense } from "react";
import { BrandLoader } from "@/components/brand-loader";
import { TournamentPage } from "@/components/app/events/tournament-view";

export const metadata: Metadata = {
  title: "Tournament — Exeku",
  description: "Register your team and compete.",
};

type Params = Promise<{ id: string }>;

async function Tournament({ params }: { params: Params }) {
  const { id } = await params;
  return <TournamentPage id={id} />;
}

export default function TournamentRoute({ params }: { params: Params }) {
  return <Suspense fallback={<BrandLoader label="Loading tournament…" />}><Tournament params={params} /></Suspense>;
}
