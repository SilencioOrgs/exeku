"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useProfile } from "@/hooks/use-profile";
import { useAppearance } from "@/hooks/use-appearance";
import { buttonVariants } from "@/components/ui/button";
import { DotIcon } from "@/components/retro/dot-icon";
import { CircuitView } from "@/components/lab/circuit-view";

const STATS = [
  { value: "4", label: "languages judged" },
  { value: "AC/WA", label: "instant verdicts" },
  { value: "3D", label: "Arduino lab" },
];

export function Hero() {
  const { profile } = useProfile();
  const { effectiveReducedMotion } = useAppearance();
  const [ledOn, setLedOn] = useState(true);

  useEffect(() => {
    if (effectiveReducedMotion) return;
    const id = window.setInterval(() => setLedOn((on) => !on), 650);
    return () => window.clearInterval(id);
  }, [effectiveReducedMotion]);

  return (
    <section id="hero" className="bg-grid relative overflow-hidden border-b border-[var(--color-border)]">
      <div aria-hidden="true" className="pointer-events-none absolute -top-40 right-[-10%] h-[560px] w-[760px] rounded-full bg-[radial-gradient(closest-side,rgb(255_161_22/0.22),transparent)] blur-2xl" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-[var(--color-canvas)]" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-8 px-4 pt-14 pb-16 sm:px-6 md:pt-20 lg:grid-cols-[1fr_1.15fr] lg:gap-4 lg:px-8 lg:pb-24">
        <div className="max-w-xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/80 px-3 py-1 text-xs font-medium text-[var(--color-text-muted)]">
            <span className="size-1.5 rounded-full bg-[var(--color-primary)] shadow-[0_0_8px_var(--color-primary)]" aria-hidden="true" />
            Developer preview · Your code. Your machine.
          </span>
          <h1 className="mt-6 text-5xl leading-[1.02] font-semibold tracking-tight text-[var(--color-text-main)] sm:text-6xl xl:text-7xl">
            Code it.<br />Wire it.<br /><span className="text-gradient-orange">Print it.</span>
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-[var(--color-text-muted)]">
            Practice problems like a competitive programmer, with instant judging in Python, Java, C++ and C. Then take your code off the screen: blink a real-looking Arduino and get a case that fits it.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href={profile ? "/app" : "/setup"} className={buttonVariants({ size: "lg", className: "h-11 px-5 text-base" })}>
              {profile ? "Open your workspace" : "Start practicing"}<DotIcon name="arrowRight" size={16} aria-hidden="true" />
            </Link>
            <a href="#tour" className={buttonVariants({ variant: "outline", size: "lg", className: "h-11 px-5 text-base" })}>
              Take the tour<DotIcon name="arrowDown" size={16} aria-hidden="true" />
            </a>
          </div>
          <dl className="mt-10 grid max-w-md grid-cols-3 gap-4 border-t border-[var(--color-border)] pt-6">
            {STATS.map((stat) => (
              <div key={stat.label}>
                <dt className="text-xs text-[var(--color-text-muted)]">{stat.label}</dt>
                <dd className="font-code mt-1 text-xl font-semibold text-[var(--color-text-main)]">{stat.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="relative">
          <CircuitView
            ledOn={ledOn}
            view={[120, 120, 190]}
            className="h-[340px] sm:h-[460px] lg:h-[560px]"
            label="A 3D Arduino Uno wired to a breadboard with a blinking red LED. Drag to rotate."
          />
          <div className="pointer-events-none absolute bottom-4 left-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/85 px-3 py-2 backdrop-blur">
            <p className="font-code text-xs text-[var(--color-text-muted)]">blink.ino</p>
            <p className="font-code text-sm"><span className="tok-function">digitalWrite</span>(<span className="tok-number">13</span>, <span className="tok-constant">{ledOn ? "HIGH" : "LOW"}</span>);</p>
          </div>
          <p className="pointer-events-none absolute right-4 bottom-4 text-xs text-[var(--color-text-muted)]">Drag to rotate</p>
        </div>
      </div>
    </section>
  );
}
