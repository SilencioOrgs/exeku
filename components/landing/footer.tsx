import React from "react";
import { ArrowUp, CirclePlay, GitBranch } from "lucide-react";
import { BrandWordmark } from "@/components/brand-logo";

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
              <BrandWordmark height={44} />
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
                    <span className="text-[var(--color-primary-text)]"><CirclePlay size={14} aria-hidden="true" /></span>
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
                  <GitBranch size={14} className="text-[var(--color-accent)]" />
                  SilencioOrgs/exeku
                </a>
              </li>
            </ul>

            <a
              href="#hero"
              className="inline-flex items-center gap-1 text-[var(--color-accent)] hover:underline"
            >
              <ArrowUp size={14} className="text-[var(--color-accent)]" /> Back to top
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
