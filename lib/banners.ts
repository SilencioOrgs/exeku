/** Banner art rendered in Blender (design/blender/exeku-banners.blend). Files live in public/banners/<id>.webp. */
export const BANNERS = [
  { id: "keycaps", label: "Keycaps" },
  { id: "circuit", label: "Circuit" },
  { id: "lineup", label: "Ninja lineup" },
  { id: "podium", label: "Podium" },
  { id: "shuriken", label: "Shuriken" },
  { id: "codelines", label: "Code lines" },
] as const;

export type BannerId = (typeof BANNERS)[number]["id"];

export const DEFAULT_BANNER: BannerId = "keycaps";

export const isBannerId = (value: unknown): value is BannerId => BANNERS.some((b) => b.id === value);

/** Anything unrecognized (an old saved value, for example) falls back to the default art. */
export const bannerSrc = (id: unknown) => `/banners/${isBannerId(id) ? id : DEFAULT_BANNER}.webp`;
