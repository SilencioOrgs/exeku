"use client";

import { useState } from "react";
import Link from "next/link";
import { useProfile } from "@/hooks/use-profile";
import { BrandWordmark } from "@/components/brand-logo";
import { Button, buttonVariants } from "@/components/ui/button";
import { ArrowRight, Menu, X } from "lucide-react";

export function Navbar() {
  const { profile } = useProfile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: "Practice", href: "#practice" },
    { label: "Journey", href: "#journey" },
    { label: "About", href: "#about" },
    { label: "Languages", href: "#languages" },
    { label: "Exeku Lab", href: "#lab-app" },
    { label: "FAQ", href: "#faq" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[var(--color-border)] bg-[var(--color-canvas)]/95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-16 py-3 flex gap-3 flex-wrap items-center justify-between">
        {/* Brand Wordmark */}
        <div className="flex items-center gap-3">
          <a
            href="#hero"
            className="flex items-center gap-2 group outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
          >
            <BrandWordmark height={38} />
          </a>

        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-6 text-sm">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-colors rounded outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Action Button & Mobile Menu Toggle */}
        <div className="flex items-center gap-3">
          <Link href={profile ? "/app" : "/setup"} className={buttonVariants({ className: "hidden sm:inline-flex" })}>
            {profile ? "Open app" : "Get started"}<ArrowRight size={14} aria-hidden="true" />
          </Link>

          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[var(--color-surface)] border-b border-[var(--color-border)] px-4 pt-2 pb-6 flex flex-col gap-4">

          <nav className="flex flex-col gap-3">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="border-b border-[var(--color-border-subtle)] py-2 text-base text-[var(--color-text-main)] hover:text-[var(--color-primary-text)]"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <Link href={profile ? "/app" : "/setup"} onClick={() => setMobileMenuOpen(false)} className={buttonVariants({ size: "lg", className: "w-full" })}>
            {profile ? "Open app" : "Get started"}
          </Link>
        </div>
      )}
    </header>
  );
}
