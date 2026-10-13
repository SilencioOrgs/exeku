export interface AvatarDefinition {
  id: string;
  name: string;
  role: string;
  accentColor: string;
  bgColor: string;
}

export const AVATARS: AvatarDefinition[] = [
  {
    id: "glitch-bot",
    name: "Glitch-01",
    role: "Cybernetic Chassis",
    accentColor: "#00F0FF",
    bgColor: "#0E1B2E",
  },
  {
    id: "pixel-cat",
    name: "Cyber-Neko",
    role: "Feline Scout",
    accentColor: "#FF007A",
    bgColor: "#2E0E22",
  },
  {
    id: "crt-terminal",
    name: "Phosphor-80",
    role: "CRT Terminal Unit",
    accentColor: "#00FF9D",
    bgColor: "#0A241B",
  },
  {
    id: "matrix-mage",
    name: "Void-Mage",
    role: "Byte Sorcerer",
    accentColor: "#9E00FF",
    bgColor: "#200E33",
  },
  {
    id: "byte-skull",
    name: "Skull-ROM",
    role: "Kernel Sentinel",
    accentColor: "#00F0FF",
    bgColor: "#131026",
  },
  {
    id: "synth-scout",
    name: "Astro-Scout",
    role: "Orbital Navigator",
    accentColor: "#FFB800",
    bgColor: "#2E240E",
  },
  {
    id: "chip-core",
    name: "Core-Die",
    role: "Silicon Processor",
    accentColor: "#00F0FF",
    bgColor: "#0C1F26",
  },
  {
    id: "retro-ninja",
    name: "Shinobi-08",
    role: "Shadow Executable",
    accentColor: "#FF007A",
    bgColor: "#2B0B1D",
  },
];

export const DEFAULT_AVATAR_ID = "glitch-bot";

export function getAvatar(avatarId: string): AvatarDefinition {
  return AVATARS.find((a) => a.id === avatarId) ?? AVATARS[0];
}
