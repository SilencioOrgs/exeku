/**
 * Exeku Lab is a separate desktop/mobile app (Arduino and MCU simulation, 3D design, printable cases).
 * The website only promotes it. Fill in a URL when a build is published; empty means "Coming soon".
 */
export const LAB_APP = {
  name: "Exeku Lab",
  tagline: "Arduino and MCU simulator",
  downloads: [
    { id: "desktop", label: "Desktop app", icon: "windows", url: "" },
    { id: "mobile", label: "Mobile app", icon: "phone", url: "" },
  ],
} as const;
