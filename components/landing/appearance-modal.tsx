"use client";

import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Palette } from "lucide-react";
import { useState } from "react";
import { PixelButton } from "@/components/retro/pixel-button";
import { AppearanceStudio } from "@/components/app/appearance-studio";
import { useAppearance } from "@/hooks/use-appearance";

export function AppearanceModal() {
  const [open, setOpen] = useState(false);
  const { persistenceStatus } = useAppearance();
  return <Dialog open={open} onOpenChange={next => { if (persistenceStatus !== "saving") setOpen(next); }}>
    <DialogTrigger render={<PixelButton variant="secondary" size="sm" />}><Palette aria-hidden="true" className="size-4" />Appearance</DialogTrigger>
    <DialogContent className="appearance-dialog max-h-[90dvh] overflow-y-auto sm:max-w-5xl">
      <DialogTitle>Make Exeku yours</DialogTitle>
      <DialogDescription>Explore a style, then apply it. Closing this preview discards changes.</DialogDescription>
      {open && <AppearanceStudio compact onApplied={() => setOpen(false)} />}
    </DialogContent>
  </Dialog>;
}
