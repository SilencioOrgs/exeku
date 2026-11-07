/** Desk clock template: case size (mm) and parts. No three.js here, so pages can import it cheaply. */
export const CLOCK_CASE = { w: 110, h: 48, d: 62, wall: 2.4, radius: 6 } as const;
export const CLOCK_PARTS = [
  "Arduino Nano",
  "TM1637 4-digit display",
  "DS3231 real-time clock",
  "2 push buttons",
  "Piezo buzzer",
  "Carrier perfboard",
] as const;

/** Segments a–g for 0–9 (a top, then clockwise, g middle). */
const DIGITS = ["abcdef", "bc", "abdeg", "abcdg", "bcfg", "acdfg", "acdefg", "abc", "abcdefg", "abcdfg"];
/** Lit segments for one digit of a 7-segment display. */
export const digitSegments = (n: number) => DIGITS[n] ?? "";
