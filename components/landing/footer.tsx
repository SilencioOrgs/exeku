import React from "react";
import { DotIcon } from "@/components/retro/dot-icon";

export function Footer() {
  const navLinks = [
    { label: "Journey", href: "#journey" },
    { label: "About", href: "#about" },
    { label: "Languages", href: "#languages" },
    { label: "Exeku Lab", href: "#lab-app" },
    { label: "FAQ", href: "#faq" },
  ];

  return (
    <footer className="bg-[var(--color-canvas)] border-t border-[var(--color-border)] text-[var(--color-text-muted)] font-mono text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-[var(--color-elevated)] border border-[var(--color-primary)] flex items-center justify-center text-[var(--color-accent)]">
                <DotIcon name="powershell" size={16} />
              </div>
              <span
                className="text-2xl font-bold text-[var(--color-text-main)]"
                style={{ fontFamily: "var(--font-heading-active)" }}
              >
                exeku
              </span>
            </div>

            <p className="text-sm font-sans text-[var(--color-text-muted)] max-w-md leading-relaxed">
              Competitive programming practice for students, right in the browser.
            </p>

          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-[var(--color-text-main)] font-bold text-sm mb-3">
              Navigation
            </h4>
            <ul className="space-y-2">
              {navLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="hover:text-[var(--color-accent)] transition-colors flex items-center gap-1.5"
                  >
                    <span className="text-[var(--color-primary-text)]"><DotIcon name="circlePlay" size={14} aria-hidden="true" /></span>
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Repository & System */}
          <div>
            <h4 className="text-[var(--color-text-main)] font-bold text-sm mb-3">
              Repository
            </h4>
            <ul className="space-y-2 mb-4">
              <li>
                <a
                  href="https://github.com/SilencioOrgs/exeku"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[var(--color-accent)] transition-colors flex items-center gap-1.5"
                >
                  <DotIcon name="github" size={14} className="text-[var(--color-accent)]" />
                  SilencioOrgs/exeku
                </a>
              </li>
            </ul>

            <a
              href="#hero"
              className="inline-flex items-center gap-1 text-[var(--color-accent)] hover:underline"
            >
              <DotIcon name="arrowUp" size={14} className="text-[var(--color-accent)]" /> Back to top
            </a>
          </div>
        </div>

        <div className="border-t border-[var(--color-border)] pt-8 text-xs text-[var(--color-text-muted)]">
          © 2026 Exeku
        </div>
      </div>
    </footer>
  );
}
