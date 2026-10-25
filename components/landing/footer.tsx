import React from "react";
import { PixelBadge } from "@/components/retro/pixel-badge";
import { DotIcon } from "@/components/retro/dot-icon";

export function Footer() {
  const navLinks = [
    { label: "About", href: "#about" },
    { label: "Languages", href: "#languages" },
    { label: "Roadmap", href: "#features" },
    { label: "Installation", href: "#install" },
    { label: "FAQ", href: "#faq" },
  ];

  return (
    <footer className="bg-[var(--color-canvas)] border-t border-[var(--color-border)] text-[var(--color-text-muted)] text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[var(--color-elevated)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-main)]">
                <DotIcon name="powershell" size={16} />
              </div>
              <span
                className="text-2xl font-bold text-[var(--color-text-main)] tracking-wider"
                style={{ fontFamily: "var(--font-heading-active)" }}
              >
                exeku
              </span>
            </div>

            <p className="text-sm font-sans text-[var(--color-text-muted)] max-w-md leading-relaxed">
              Your Code. Your Machine. Programming practice and assessment platform
              tailored for Windows computer labs, classrooms, and privacy-first software
              engineers.
            </p>

            <div className="pt-2 flex flex-wrap gap-2">
              <PixelBadge variant="mint">DEVELOPER PREVIEW</PixelBadge>
              <PixelBadge variant="cyan">NEXT.JS</PixelBadge>
              <PixelBadge variant="pink">LOCAL PROFILES</PixelBadge>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-[var(--color-text-main)] font-bold text-sm tracking-wider uppercase mb-3">
              Navigation
            </h4>
            <ul className="space-y-2">
              {navLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="hover:text-[var(--color-text-main)] transition-colors flex items-center gap-1.5"
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
            <h4 className="text-[var(--color-text-main)] font-bold text-sm tracking-wider uppercase mb-3">
              Repository
            </h4>
            <ul className="space-y-2 mb-4">
              <li>
                <a
                  href="https://github.com/SilencioOrgs/exeku"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[var(--color-text-main)] transition-colors flex items-center gap-1.5"
                >
                  <DotIcon name="github" size={14} className="text-[var(--color-text-main)]" />
                  SilencioOrgs/exeku
                </a>
              </li>
              <li className="text-[var(--color-text-dim)]">Private Repository (Invite only)</li>
            </ul>

            <a
              href="#hero"
              className="inline-flex items-center gap-1 text-[var(--color-text-main)] hover:underline"
            >
              <DotIcon name="arrowUp" size={14} className="text-[var(--color-text-main)]" /> Back to top
            </a>
          </div>
        </div>

        {/* System Telemetry Dock */}
        <div className="pt-8 border-t border-[var(--color-elevated)] flex flex-col sm:flex-row items-center justify-between gap-4 text-[0.6875rem] text-[var(--color-text-dim)]">
          <div className="flex flex-wrap items-center gap-4">
            <span>Exeku · Developer preview</span>
          </div>

          <div>
            © 2026 Exeku Contributors. Distributed as a developer preview.
          </div>
        </div>
      </div>
    </footer>
  );
}
