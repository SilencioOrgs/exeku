"use client";

import { useEffect, useState, type RefObject } from "react";

/** True once the element comes within `margin` of the viewport. Used to start heavy 3D scenes only when needed. */
export function useNearViewport(ref: RefObject<Element | null>, margin = "600px") {
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || near) return;
    const io = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) setNear(true); }, { rootMargin: margin });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, margin, near]);
  return near;
}
