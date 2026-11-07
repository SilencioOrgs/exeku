"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppearance } from "@/hooks/use-appearance";

/** One-click light/dark switch. Saves the choice like the Settings page does. */
export function ThemeToggle({ className }: { className?: string }) {
  const { effectiveColorMode, setColorMode } = useAppearance();
  const isDark = effectiveColorMode === "dark";
  const label = isDark ? "Switch to light mode" : "Switch to dark mode";
  return (
    <Button type="button" variant="ghost" size="icon" className={className} title={label} aria-label={label} onClick={() => void setColorMode(isDark ? "light" : "dark")}>
      {isDark ? <Sun size={17} aria-hidden="true" /> : <Moon size={17} aria-hidden="true" />}
    </Button>
  );
}
