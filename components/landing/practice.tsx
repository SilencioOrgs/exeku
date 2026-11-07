import { DotIcon, type DotIconName } from "@/components/retro/dot-icon";
import { PixelTerminal } from "./pixel-terminal";

const POINTS: Array<{ icon: DotIconName; title: string; body: string }> = [
  { icon: "list", title: "Easy, Medium, Hard", body: "A problem list you can scan in a second, filtered by topic and language." },
  { icon: "shield", title: "Judged in a sandbox", body: "Every submission runs in an isolated container with time and memory limits." },
  { icon: "clock", title: "Timed challenges", body: "Practice under contest pressure with a countdown and hidden tests." },
];

/** Competitive-programming half of the landing page: the live editor demo. */
export function Practice() {
  return (
    <section id="practice" className="border-b border-[var(--color-border)] py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div className="min-w-0">
            <p className="font-code text-xs font-medium text-[var(--color-primary-text)]">Practice</p>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">Train like it&apos;s contest day.</h2>
            <p className="mt-4 text-lg leading-relaxed text-[var(--color-text-muted)]">
              Read the problem, write in Python 3, Java, C++ or C, and get Accepted or Wrong answer back in seconds.
            </p>
            <ul className="mt-8 space-y-4">
              {POINTS.map((point) => (
                <li key={point.title} className="flex gap-3">
                  <span className="skeuo-key grid size-9 shrink-0 place-items-center rounded-lg bg-[var(--color-elevated)] text-[var(--color-primary-text)]">
                    <DotIcon name={point.icon} size={16} aria-hidden="true" />
                  </span>
                  <span><strong className="block font-medium">{point.title}</strong><span className="text-sm text-[var(--color-text-muted)]">{point.body}</span></span>
                </li>
              ))}
            </ul>
          </div>
          <div className="relative min-w-0">
            <div aria-hidden="true" className="pointer-events-none absolute -inset-10 rounded-full bg-[radial-gradient(closest-side,rgb(255_161_22/0.12),transparent)]" />
            <div className="relative"><PixelTerminal /></div>
          </div>
        </div>
      </div>
    </section>
  );
}
