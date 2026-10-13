import React from "react";
import { PixelBadge } from "@/components/retro/pixel-badge";
import { Terminal, GitBranch, ArrowUp } from "lucide-react";

export function Footer() {
  const navLinks = [
    { label: "About", href: "#about" },
    { label: "Languages", href: "#languages" },
    { label: "Roadmap", href: "#features" },
    { label: "Installation", href: "#install" },
    { label: "FAQ", href: "#faq" },
  ];

  return (
    <footer className="bg-[#07040F] border-t-2 border-[#2E1A57] text-[#A79EC4] font-mono text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-[#1B0F36] border border-[#9E00FF] flex items-center justify-center text-[#00F0FF]">
                <Terminal className="w-3.5 h-3.5" />
              </div>
              <span
                className="text-2xl font-bold text-white tracking-wider"
                style={{ fontFamily: "var(--font-pixelify)" }}
              >
                exeku<span className="text-[#00F0FF]">_</span>
              </span>
            </div>

            <p className="text-sm font-sans text-[#A79EC4] max-w-md leading-relaxed">
              Your Code. Your Machine. Offline-first programming education platform
              tailored for Windows computer labs, classrooms, and privacy-first software
              engineers.
            </p>

            <div className="pt-2 flex flex-wrap gap-2">
              <PixelBadge variant="mint">OFFLINE FIRST</PixelBadge>
              <PixelBadge variant="cyan">WINDOWS x64</PixelBadge>
              <PixelBadge variant="pink">ZERO TELEMETRY</PixelBadge>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-bold text-sm tracking-wider uppercase mb-3">
              Navigation
            </h4>
            <ul className="space-y-2">
              {navLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="hover:text-[#00F0FF] transition-colors flex items-center gap-1.5"
                  >
                    <span className="text-[#9E00FF]">▶</span>
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Repository & System */}
          <div>
            <h4 className="text-white font-bold text-sm tracking-wider uppercase mb-3">
              Repository
            </h4>
            <ul className="space-y-2 mb-4">
              <li>
                <a
                  href="https://github.com/SilencioOrgs/exeku"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#00F0FF] transition-colors flex items-center gap-1.5"
                >
                  <GitBranch className="w-3.5 h-3.5 text-[#00F0FF]" />
                  SilencioOrgs/exeku
                </a>
              </li>
              <li className="text-[#6D628B]">Private Repository (Invite only)</li>
            </ul>

            <a
              href="#hero"
              className="inline-flex items-center gap-1 text-[#00F0FF] hover:underline"
            >
              <ArrowUp className="w-3.5 h-3.5" /> Back to top
            </a>
          </div>
        </div>

        {/* System Telemetry Dock */}
        <div className="pt-8 border-t border-[#1B0F36] flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-[#6D628B]">
          <div className="flex flex-wrap items-center gap-4">
            <span>[HOST: 127.0.0.1]</span>
            <span>[PORT: 3000]</span>
            <span>[RUNTIME: NODE.JS / NEXT.JS 16]</span>
          </div>

          <div>
            © 2026 Exeku Contributors. Distributed as a developer preview.
          </div>
        </div>
      </div>
    </footer>
  );
}
