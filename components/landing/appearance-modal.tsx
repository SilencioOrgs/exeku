"use client";

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AppearanceStudio } from "@/components/app/appearance-studio";
import { useAppearance } from "@/hooks/use-appearance";

export function AppearanceModal() {
  const [open, setOpen] = useState(false);
  const { persistenceStatus } = useAppearance();
  return <Dialog open={open} onOpenChange={(next) => { if (persistenceStatus !== "saving") setOpen(next); }}>
    <DialogTrigger render={<Button variant="outline" size="sm" />}><SlidersHorizontal size={15} aria-hidden="true" />Appearance</DialogTrigger>
    <DialogContent className="w-[min(32rem,calc(100vw-2rem))] max-h-[90dvh] overflow-y-auto">
      <DialogTitle>Appearance</DialogTitle>
      <DialogDescription>Choose Light, Dark, or System. Changes are applied only when saved.</DialogDescription>
      {open && <AppearanceStudio compact onApplied={() => setOpen(false)} />}
    </DialogContent>
  </Dialog>;
}
