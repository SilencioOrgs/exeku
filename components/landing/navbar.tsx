"use client";

import { AppearanceModal } from "./appearance-modal";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useProfile } from "@/hooks/use-profile";
import { PixelBadge } from "@/components/retro/pixel-badge";
import { PixelButton } from "@/components/retro/pixel-button";
import { DotIcon } from "@/components/retro/dot-icon";

export function Navbar() {
  const router = useRouter();
  const { profile } = useProfile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: "About", href: "#about" },
    { label: "Languages", href: "#languages" },
    { label: "Roadmap", href: "#features" },
    { label: "Installation", href: "#install" },
    { label: "FAQ", href: "#faq" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-[var(--color-canvas)]/95 backdrop-blur-sm border-b-2 border-[var(--color-border)] shadow-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-16 py-3 flex gap-3 flex-wrap items-center justify-between">
        {/* Brand Wordmark */}
        <div className="flex items-center gap-3">
          <a
            href="#hero"
            className="flex items-center gap-2 group outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
          >
            <div className="w-8 h-8 rounded-lg bg-[var(--color-elevated)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-main)]">
              <DotIcon name="powershell" size={16} />
            </div>
            <span className="font-heading text-xl font-semibold tracking-tight text-foreground transition-colors">
              exeku
            </span>
          </a>

          <div className="hidden sm:flex items-center ml-2">
            <PixelBadge variant="cyan">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] animate-pulse mr-1" />
              ONLINE PREVIEW
            </PixelBadge>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden xl:flex items-center gap-4 text-sm font-mono tracking-wide">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors flex items-center gap-1 group outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-accent)]"
            >
              <span className="text-[var(--color-primary)] opacity-0 group-hover:opacity-100 transition-opacity">
                <DotIcon name="circlePlay" size={14} aria-hidden="true" />
              </span>
              {link.label}
            </a>
          ))}
        </nav>

        {/* Action Button & Mobile Menu Toggle */}
        <div className="flex items-center gap-3">
          <AppearanceModal />
          <div className="hidden sm:block">
            <PixelButton
              variant="cyan"
              size="sm"
              onClick={() => router.push(profile ? "/app" : "/setup")}
            >
              {profile ? "Workspace" : "Get Started"} <DotIcon name="arrowUp" className="w-3.5 h-3.5" />
            </PixelButton>
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="xl:hidden min-h-11 min-w-11 p-2 text-[var(--color-text-muted)] hover:text-foreground bg-[var(--color-elevated)] border border-[var(--color-border)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <DotIcon name="close" className="w-5 h-5" /> : <DotIcon name="burger" className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="xl:hidden bg-[var(--color-surface)] border-b-2 border-[var(--color-border)] px-4 pt-3 pb-6 flex flex-col gap-4">
          <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border)]">
            <PixelBadge variant="cyan">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] animate-pulse mr-1" />
              ONLINE PREVIEW
            </PixelBadge>
            <span className="text-xs font-mono text-[var(--color-text-muted)]">LOCAL DEV PREVIEW</span>
          </div>

          <nav className="flex flex-col gap-3">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="text-[var(--color-text-main)] hover:text-[var(--color-accent)] font-mono text-base py-1.5 border-b border-[var(--color-elevated)] flex items-center justify-between"
              >
                <span>{link.label}</span>
                <span className="text-[var(--color-accent)] text-sm"><DotIcon name="circlePlay" size={14} aria-hidden="true" /></span>
              </a>
            ))}
          </nav>

          <div className="pt-2">
            <PixelButton
              variant="cyan"
              size="md"
              onClick={() => {
                setMobileMenuOpen(false);
                router.push(profile ? "/app" : "/setup");
              }}
              className="w-full"
            >
              {profile ? "Open Workspace" : "Get Started (Setup Profile)"}
            </PixelButton>
          </div>
        </div>
      )}
    </header>
  );
}
