import { Clock3, List, Shield, type LucideIcon } from "lucide-react";
import { PixelTerminal } from "./pixel-terminal";
import { ScrollReveal } from "./scroll-reveal";

const POINTS: Array<{ icon: LucideIcon; title: string; body: string }> = [
  { icon: List, title: "Easy, Medium, Hard", body: "A problem list you can scan in a second, filtered by topic and language." },
  { icon: Shield, title: "Judged in a sandbox", body: "Every submission runs in an isolated container with time and memory limits." },
  { icon: Clock3, title: "Timed challenges", body: "Practice under contest pressure with a countdown and hidden tests." },
];

/** Competitive-programming half of the landing page: the live editor demo. */
export function Practice() {
  return (
    <section id="practice" className="overflow-x-clip border-b border-[var(--color-border)] py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
          <div className="min-w-0">
            <ScrollReveal variant="copy">
              <h2 className="text-4xl font-semibold tracking-tight md:text-5xl">Train like it&apos;s contest day.</h2>
              <p className="mt-4 max-w-xl text-lg leading-relaxed text-[var(--color-text-muted)]">
                Read the problem, write in Python 3, Java, C++ or C, and get Accepted or Wrong answer back in seconds.
              </p>
            </ScrollReveal>

            <ul className="mt-8 space-y-3.5">
              {POINTS.map((point, index) => (
                <li key={point.title}>
                  <ScrollReveal
                    variant="key"
                    delayMs={index * 70}
                    className="skeuo-panel flex items-start gap-3.5 p-3.5 sm:p-4"
                  >
                    <span className="skeuo-key grid size-10 shrink-0 place-items-center rounded-lg bg-[var(--color-elevated)] text-[var(--color-primary-text)]">
                      <point.icon size={17} aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <strong className="block font-semibold text-[var(--color-text-main)]">{point.title}</strong>
                      <span className="mt-0.5 block text-sm leading-relaxed text-[var(--color-text-muted)]">{point.body}</span>
                    </span>
                  </ScrollReveal>
                </li>
              ))}
            </ul>
          </div>

          <ScrollReveal variant="panel" delayMs={100} className="relative min-w-0">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -inset-10 rounded-full bg-[radial-gradient(closest-side,rgb(255_161_22/0.12),transparent)]"
            />
            <div className="relative">
              <PixelTerminal />
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
