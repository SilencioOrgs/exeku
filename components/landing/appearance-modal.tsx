"use client";

import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Palette } from "lucide-react";
import { PixelButton } from "@/components/retro/pixel-button";
import { StyleSelector, AppearanceSaveStatus } from "@/components/appearance/style-selector";
import { ColorModeChoice } from "@/components/app/appearance-studio";

export function AppearanceModal() {
  return <Dialog>
    <DialogTrigger render={<PixelButton variant="secondary" size="sm" />}><Palette aria-hidden="true" className="size-4" />Appearance</DialogTrigger>
    <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-3xl">
      <DialogTitle>Make Exeku yours</DialogTitle>
      <DialogDescription>Preview a style now. Your choice follows you into setup and your workspace.</DialogDescription>
      <StyleSelector /><ColorModeChoice /><AppearanceSaveStatus />
    </DialogContent>
  </Dialog>;
}
