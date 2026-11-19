"use client";

import Link from "next/link";
import { useProfile } from "@/hooks/use-profile";
import { buttonVariants } from "@/components/ui/button";
import { ArrowDown, ArrowRight } from "lucide-react";
import { VersusScene } from "./versus-scene";
import { ScrollReveal } from "./scroll-reveal";

const STATS = [
  { value: "4", label: "languages judged" },
  { value: "AC/WA", label: "instant verdicts" },
  { value: "Timed", label: "challenge mode" },
];

export function Hero() {
  const { profile } = useProfile();

  return (
    <section id="hero" className="relative overflow-hidden border-b border-[var(--color-border)]">
      <div aria-hidden="true" className="bg-grid absolute inset-0 opacity-60" />
      <div aria-hidden="true" className="pointer-events-none absolute top-1/3 left-1/2 h-[620px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(255_161_22/0.16),transparent)]" />
      <VersusScene className="absolute inset-x-0 top-0 h-[54vh] min-h-[340px] md:inset-y-0 md:h-auto" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 hidden w-[46%] bg-gradient-to-r from-[var(--color-canvas)] via-[var(--color-canvas)]/75 to-transparent md:block" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-[var(--color-canvas)]" />

      <div className="pointer-events-none relative mx-auto flex min-h-[calc(100svh-4rem)] max-w-7xl items-end px-4 pt-[50vh] pb-14 sm:px-6 md:items-center md:pt-16 lg:px-8">
        <ScrollReveal variant="copy" className="pointer-events-auto max-w-xl">
          <h1 className="text-5xl leading-[1.02] font-semibold tracking-tight text-[var(--color-text-main)] sm:text-6xl xl:text-7xl">
            Out-code<br />your <span className="text-gradient-orange">rival.</span>
          </h1>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-[var(--color-text-muted)]">
            Competitive programming practice for students. Same problem, same clock: solve it in Python, Java, C++ or C and let the judge decide, test by test.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href={profile ? "/app/challenges" : "/setup"} className={buttonVariants({ size: "lg", className: "h-11 px-5 text-base" })}>
              {profile ? "Pick a problem" : "Start practicing"}<ArrowRight size={16} aria-hidden="true" />
            </Link>
            <a href="#practice" className={buttonVariants({ variant: "outline", size: "lg", className: "h-11 px-5 text-base" })}>
              See how it works<ArrowDown size={16} aria-hidden="true" />
            </a>
          </div>
          <dl className="skeuo-panel mt-10 grid max-w-md grid-cols-3 gap-2 p-2">
            {STATS.map((stat) => (
              <div key={stat.label} className="skeuo-well min-w-0 rounded-xl border px-3 py-2.5">
                <dt className="truncate text-xs text-[var(--color-text-muted)]">{stat.label}</dt>
                <dd className="font-code mt-1 text-lg font-semibold text-[var(--color-text-main)] sm:text-xl">{stat.value}</dd>
              </div>
            ))}
          </dl>
        </ScrollReveal>
      </div>
    </section>
  );
}
