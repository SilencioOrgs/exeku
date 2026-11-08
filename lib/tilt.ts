export interface Tilt {
  /** Degrees around each axis. */
  rx: number;
  ry: number;
  /** Where the foil sheen sits, 0 to 100. */
  gx: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** The card leans toward the pointer, up to maxDegrees at its edges. */
export function hoverTilt(x: number, y: number, rect: { left: number; top: number; width: number; height: number }, maxDegrees = 14): Tilt {
  const nx = clamp((x - rect.left) / rect.width, 0, 1);
  const ny = clamp((y - rect.top) / rect.height, 0, 1);
  return { rx: (0.5 - ny) * 2 * maxDegrees, ry: (nx - 0.5) * 2 * maxDegrees, gx: nx * 100 };
}

/** Dragging turns the card further, but never far enough to show its blank back. */
export function dragTilt(dx: number, dy: number): Tilt {
  const ry = clamp(dx * 0.45, -55, 55);
  return { rx: clamp(-dy * 0.35, -35, 35), ry, gx: 50 + ry * 0.9 };
}
