"use client";

import { useRef, useState, type PointerEvent, type ReactNode } from "react";
import { ArrowUpRight, Maximize2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { BrandLogo } from "@/components/brand-logo";
import { PixelAvatar } from "@/components/retro/pixel-avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { EXEKU_SOCIAL_URL } from "@/lib/contact";
import { dragTilt, hoverTilt, type Tilt } from "@/lib/tilt";

export interface IdCardProps {
  fullName: string;
  school: string;
  campus: string;
  pending: boolean;
  avatarId: string;
  borderId?: string;
  serial: string;
}

/** Decorative. Every value is already on the page as text, and the code's link is a real link when expanded. */
function IdFace({ fullName, school, campus, pending, avatarId, borderId, serial }: IdCardProps) {
  return (
    <div aria-hidden="true" className="id-tilt flex w-full flex-col items-center">
      <div className="id-clip" />
      <div className="id-sleeve">
        <div className="id-card">
          <div className="id-card-head"><span className="flex items-center gap-1.5"><BrandLogo size={20} />exeku</span><span>Student</span></div>
          <div className="px-3.5 pt-3 pb-3">
            <div className="flex items-start justify-between">
              <PixelAvatar avatarId={avatarId} borderId={borderId} size={64} className="mt-1" />
              <div className="id-qr">
                <QRCodeSVG value={EXEKU_SOCIAL_URL} size={72} level="H" marginSize={0} bgColor="transparent" fgColor="var(--id-ink)"
                  imageSettings={{ src: "/brand/exeku-logo.webp", width: 16, height: 16, excavate: true }} />
                <p>Follow Exeku</p>
              </div>
            </div>
            <p className="mt-2.5 text-base leading-tight font-semibold break-words text-[var(--id-ink)]">{fullName}</p>
            <p className="mt-1.5 text-xs leading-snug break-words text-[var(--id-ink-muted)]">
              {school || "Your school"}{campus ? <><br />{campus}</> : null}
            </p>
            {pending && <p className="mt-1 text-xs font-medium text-[var(--id-ink)]">School pending review</p>}
            <div className="id-barcode mt-2.5" />
            <p className="font-code mt-1 text-center text-[0.625rem] tracking-[0.2em] text-[var(--id-ink-muted)]">{serial}</p>
          </div>
          <div className="id-foil" />
        </div>
      </div>
    </div>
  );
}

function IdStage({ draggable, onClick, children }: { draggable?: boolean; onClick?: () => void; children: ReactNode }) {
  const dragStart = useRef<{ x: number; y: number } | null>(null);

  const show = (el: HTMLElement, tilt: Tilt) => {
    el.dataset.active = "";
    el.style.setProperty("--id-rx", `${tilt.rx}deg`);
    el.style.setProperty("--id-ry", `${tilt.ry}deg`);
    el.style.setProperty("--id-gx", `${tilt.gx}%`);
  };
  const rest = (el: HTMLElement) => {
    delete el.dataset.active;
    delete el.dataset.dragging;
    for (const name of ["--id-rx", "--id-ry", "--id-gx"]) el.style.removeProperty(name);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const el = event.currentTarget;
    const start = dragStart.current;
    if (start) show(el, dragTilt(event.clientX - start.x, event.clientY - start.y));
    else if (event.pointerType === "mouse") show(el, hoverTilt(event.clientX, event.clientY, el.getBoundingClientRect()));
  };
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!draggable) return;
    dragStart.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.dataset.dragging = "";
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    dragStart.current = null;
    rest(event.currentTarget);
  };

  return (
    <div className={draggable ? "id-stage id-stage-drag" : "id-stage"} onClick={onClick} onPointerMove={onPointerMove} onPointerDown={onPointerDown}
      onPointerUp={endDrag} onPointerCancel={endDrag} onPointerLeave={(event) => { if (!dragStart.current) rest(event.currentTarget); }}>
      {children}
    </div>
  );
}

export function IdCard(props: IdCardProps) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="flex flex-col items-center gap-2">
      <IdStage onClick={() => setExpanded(true)}><IdFace {...props} /></IdStage>
      <Button type="button" variant="ghost" size="sm" onClick={() => setExpanded(true)}><Maximize2 size={14} aria-hidden="true" />Expand ID</Button>
      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent className="justify-items-center sm:max-w-md">
          <div className="w-full text-center">
            <DialogTitle>Your Exeku ID</DialogTitle>
            <DialogDescription className="mt-1.5">Drag the card to turn it. Scan the code to follow Exeku.</DialogDescription>
          </div>
          <div className="id-zoom"><IdStage draggable><IdFace {...props} /></IdStage></div>
          <a href={EXEKU_SOCIAL_URL} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline" })}>Follow Exeku<ArrowUpRight size={14} aria-hidden="true" /></a>
        </DialogContent>
      </Dialog>
    </div>
  );
}
