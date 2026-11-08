/** Frames around an avatar, rendered in Blender (design/blender/exeku-borders.blend). Files live in public/borders/<id>.webp. */
export const AVATAR_BORDERS = [
  { id: "none", label: "None" },
  { id: "stitched", label: "Stitched" },
  { id: "circuit", label: "Circuit" },
  { id: "machined", label: "Machined" },
  { id: "shuriken", label: "Shuriken" },
  { id: "crown", label: "Crown" },
  { id: "neko", label: "Neko" },
] as const;

export type AvatarBorderId = (typeof AVATAR_BORDERS)[number]["id"];

/** The art spans 1.4x the avatar, so the ring lands on its edge and ornaments stick out past it. */
export const BORDER_SCALE = 1.4;

/** Null means no frame: "none", nothing saved, or an id that no longer exists. */
export function borderSrc(id: unknown): string | null {
  return id !== "none" && AVATAR_BORDERS.some((b) => b.id === id) ? `/borders/${id}.webp` : null;
}
