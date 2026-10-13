"use client";

import React, { useState } from "react";
import { PixelBadge } from "@/components/retro/pixel-badge";
import { PixelButton } from "@/components/retro/pixel-button";
import { DotIcon } from "@/components/retro/dot-icon";
import { Menu, X, ArrowUpRight } from "lucide-react";

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: "About", href: "#about" },
    { label: "Languages", href: "#languages" },
    { label: "Roadmap", href: "#features" },
    { label: "Installation", href: "#install" },
    { label: "FAQ", href: "#faq" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-[#090514]/95 backdrop-blur-sm border-b-2 border-[#2E1A57] shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Wordmark */}
        <div className="flex items-center gap-3">
          <a
            href="#hero"
            className="flex items-center gap-2 group outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]"
          >
            <div className="w-8 h-8 bg-[#1B0F36] border-2 border-[#9E00FF] flex items-center justify-center text-[#00F0FF] group-hover:border-[#00F0FF] transition-colors shadow-[2px_2px_0px_#000000]">
              <DotIcon name="powershell" size={16} className="text-[#00F0FF]" />
            </div>
            <span className="font-mono text-2xl font-bold tracking-wider text-white group-hover:text-[#00F0FF] transition-colors" style={{ fontFamily: "var(--font-pixelify)" }}>
              exeku<span className="text-[#00F0FF] animate-terminal-blink">_</span>
            </span>
          </a>

          <div className="hidden sm:flex items-center ml-2">
            <PixelBadge variant="mint">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#00FF9D] animate-pulse mr-1" />
              OFFLINE READY
            </PixelBadge>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-mono tracking-wide">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-[#A79EC4] hover:text-[#00F0FF] transition-colors flex items-center gap-1 group outline-none focus-visible:ring-1 focus-visible:ring-[#00F0FF]"
            >
              <span className="text-[#9E00FF] opacity-0 group-hover:opacity-100 transition-opacity">
                ▶
              </span>
              {link.label}
            </a>
          ))}
        </nav>

        {/* Action Button & Mobile Menu Toggle */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:block">
            <PixelButton
              variant="cyan"
              size="sm"
              href="#install"
            >
              Get Started <ArrowUpRight className="w-3.5 h-3.5" />
            </PixelButton>
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-[#A79EC4] hover:text-white bg-[#1B0F36] border border-[#2E1A57] outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#120A24] border-b-2 border-[#2E1A57] px-4 pt-3 pb-6 flex flex-col gap-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#2E1A57]">
            <PixelBadge variant="mint">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#00FF9D] animate-pulse mr-1" />
              OFFLINE READY
            </PixelBadge>
            <span className="text-xs font-mono text-[#A79EC4]">WINDOWS DEV PREVIEW</span>
          </div>

          <nav className="flex flex-col gap-3">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="text-[#F5F3FF] hover:text-[#00F0FF] font-mono text-base py-1.5 border-b border-[#1B0F36] flex items-center justify-between"
              >
                <span>{link.label}</span>
                <span className="text-[#00F0FF] text-sm">▶</span>
              </a>
            ))}
          </nav>

          <div className="pt-2">
            <PixelButton
              variant="cyan"
              size="md"
              href="#install"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full"
            >
              Get Started (Windows npm)
            </PixelButton>
          </div>
        </div>
      )}
    </header>
  );
}
