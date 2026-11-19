"use client";

import React, { useEffect, useRef, useState } from "react";
import { useAppearance } from "@/hooks/use-appearance";
import { cn } from "@/lib/utils";

interface ScrollRevealProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "panel" | "key" | "copy";
  delayMs?: number;
}

/**
 * Progressive scroll-reveal container for landing page panels, copy, and keycaps.
 * Content renders visible in SSR/no-JS and under reduced motion.
 */
export function ScrollReveal({
  children,
  variant = "panel",
  delayMs = 0,
  className,
  style,
  ...props
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { effectiveReducedMotion } = useAppearance();
  const [state, setState] = useState<"idle" | "pending" | "visible">("idle");

  useEffect(() => {
    const el = ref.current;
    if (!el || effectiveReducedMotion || typeof IntersectionObserver === "undefined") {
      return;
    }
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.92 && rect.bottom > 0) {
      return;
    }
    let frame = requestAnimationFrame(() => {
      frame = 0;
      setState("pending");
    });
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          if (frame) {
            cancelAnimationFrame(frame);
            frame = 0;
          }
          setState("visible");
          io.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -36px 0px" },
    );
    io.observe(el);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      io.disconnect();
    };
  }, [effectiveReducedMotion]);

  const cappedDelay = Math.min(240, Math.max(0, delayMs));
  const revealAttr = effectiveReducedMotion || state === "idle" ? undefined : state;

  return (
    <div
      ref={ref}
      data-reveal={revealAttr}
      data-reveal-variant={variant}
      className={cn("min-w-0", className)}
      style={
        cappedDelay > 0
          ? ({ "--reveal-delay": `${cappedDelay}ms`, ...style } as React.CSSProperties)
          : style
      }
      {...props}
    >
      {children}
    </div>
  );
}
