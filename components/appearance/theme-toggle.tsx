"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppearance } from "@/hooks/use-appearance";

export function ThemeToggle({ showLabel = false }: { showLabel?: boolean }) {
  const { effectiveColorMode, setColorMode, persistenceStatus } = useAppearance();
  const isDark = effectiveColorMode === "dark";
  const next = isDark ? "light" : "dark";
  const label = isDark ? "Switch to light mode" : "Switch to dark mode";

  return (
    <Button
      type="button"
      variant="outline"
      size={showLabel ? "default" : "icon"}
      className={showLabel ? "h-9 gap-2 rounded-lg border-[var(--color-border)] bg-[var(--color-surface)]" : "size-9 rounded-lg border-[var(--color-border)] bg-[var(--color-surface)]"}
      aria-label={label}
      title={label}
      disabled={persistenceStatus === "saving" || persistenceStatus === "loading"}
      onClick={() => { void setColorMode(next); }}
    >
      {isDark ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
      {showLabel && <span>{isDark ? "Light mode" : "Dark mode"}</span>}
    </Button>
  );
}
