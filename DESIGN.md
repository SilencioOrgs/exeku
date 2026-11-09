---
name: Exeku
description: Dark, orange-on-black competitive programming practice and judging in the spirit of LeetCode, with a VS Code-style editor. Your Code. Your Machine.
colors:
  canvas: "#0a0a0a"
  surface: "#121212"
  elevated: "#1a1a1a"
  border: "#262626"
  text: "#f5f5f4"
  text-muted: "#a8a29e"
  primary: "#ffa116"
  primary-hover: "#ffb340"
  primary-foreground: "#0a0a0a"
  link: "#ffb84d"
  ring: "#ffa116"
  easy: "#00b8a3"
  medium: "#ffc01e"
  hard: "#ff8a9a"
  pass: "#2cbb5d"
  fail: "#ff8a9a"
  editor-bg: "#1e1e1e"
typography:
  page-title:
    fontFamily: "Geist Sans, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  section-title:
    fontFamily: "Geist Sans, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "Geist Sans, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  caption:
    fontFamily: "Geist Sans, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.4
  code:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.6
rounded:
  sm: "6px"
  md: "8px"
  lg: "14px"
  xl: "16px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.md}"
    height: "32px"
  button-outline:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    height: "32px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.lg}"
    padding: "16px"
  code-editor:
    backgroundColor: "{colors.editor-bg}"
    textColor: "{colors.text}"
    typography: "{typography.code}"
---

# Exeku design system

## Overview

Exeku is where students practice competitive programming. It looks like LeetCode at night: black surfaces, one orange accent, Easy/Medium/Hard colors everyone recognizes, and code colored like VS Code Dark+. It is dark only; there is no light theme.

Most screens are "Operate" surfaces (problems, workspace, settings): scanability wins. The landing page is allowed more expression: the 3D versus arena and orange glows.

## Colors

- Near-black neutrals for surfaces (`--color-canvas` #0a0a0a, `--color-surface` #121212, `--color-elevated` #1a1a1a) and warm white text.
- One orange (`--color-primary` #ffa116, LeetCode orange) for primary buttons, the active nav item, focus rings, progress and highlights. Orange buttons use black text. Orange text uses `--color-primary-text` (#ffb84d).
- `.text-gradient-orange` is for one headline word on the landing page, nowhere else.
- Difficulty: `--color-easy`, `--color-medium`, `--color-hard` with `-bg` chip fills, always with the word via `DifficultyBadge`.
- Green (`--color-mint`) and red (`--color-pink`) only for verdicts, errors and destructive actions, always with a word (AC Accepted, WA Wrong answer).
- Tiles (`.tile-*`) are black surfaces lit by a faint orange glow from one corner. `.bg-grid` draws a subtle 48px grid behind 3D scenes and heroes.
- Every text/background pair is tested at 4.5:1 in `tests/appearance-contrast.test.mjs`.
- Use the CSS variables, never raw hex, in components (3D materials, illustrations and the editor's suggestion list, which must stay readable if a stylesheet fails to load, are the exceptions).

## Typography

- Geist Sans for UI and headings; Geist Mono for code, numbers, test counts and step kickers ("01 · Write"). Both ship through the `geist` npm package.
- Big, tight headlines on the landing page (`tracking-tight`, up to `text-7xl`); app pages stay at `text-3xl` and below.
- Sentence case. No ALL CAPS labels, no `[BRACKET]` labels, no trailing `_` cursors, no em dashes in UI copy.

## Layout

- App shell: sidebar (Overview, Challenges, Workspace, Profile, Settings) + top bar.
- Dashboard: competitive programming first: problem counts by difficulty, the problem set with timed-round buttons, a Timed round card, Continue coding, then a one-line Exeku Lab app strip and coding activity.
- Problems: LeetCode-style table with difficulty count cards, rounded search and pill filters.
- Landing: hero (headline left; a 3D arena where two students code head to head under a holographic VS scoreboard), Practice (editor demo), the Journey scroll tour (`#journey`: 1v1 match, Accepted, 3v3 team round, leaderboard climb, podium; same player throughout), About, Languages, the Exeku Lab app banner, FAQ. No install guide or roadmap on the site.
- Icons are minimal lucide line icons. Never emoji. Brand marks lucide doesn't ship (GitHub, LinkedIn, Google) are drawn inline.

## Depth

- Cards lift with `--shadow-raised` (a hairline top highlight and a soft black drop), 14px radius.
- Inputs sink with `--shadow-inset` on the canvas color.
- One button system: `Button` and links styled with `buttonVariants` look identical (cva adds `btn-primary` / `btn-outline` / `btn-ghost` marker classes that `globals.css` styles). Never hand-style a `<button>`; use `Button` with a variant, and `aria-pressed` for toggles and pickers.
- Buttons are subtle keys: a faint top highlight and a 1px press on `:active`. The orange button glows (`--glow-primary`) on hover. Ghost buttons stay flat.
- `/setup` is one Google sign-in card on a black machined panel (`.skeuo-panel`). The profile's School email section uses the same panel with sunken fields (`.skeuo-well`) and a printed school ID (`.id-*`), the only paper-colored object in the product.
- Banners are Blender renders in `public/banners/` (source: `design/blender/exeku-banners.blend`), listed in `lib/banners.ts`. Officers pick one per event through `BannerPicker`. New art keeps the left side dark so text stays readable on the dashboard card.
- Avatars are the eight Blender ninjas (`public/avatars/<id>.webp`) in a circle. Anyone can add a frame from `lib/avatar-borders.ts` (art in `public/borders/`, source `design/blender/exeku-borders.blend`). `PixelAvatar` draws it at 1.4x the avatar, so leave room around avatars.
- The logo is EXEKU spelled on five Blender keycaps (`BrandWordmark`, source `design/blender/exeku-wordmark.blend`). It types itself in when it appears, keys dip under the cursor and snap down when pressed. The single E key (`public/brand/exeku-logo.webp`, source `design/blender/exeku-logo.blend`) is for spots too small for the word: the favicon `app/icon.png` and the center of the QR code.
- The school ID tilts toward the pointer with a warm foil sheen, and opens larger, where it can be dragged to turn. Its QR code leads to `EXEKU_SOCIAL_URL` in `lib/contact.ts`.
- Reduced motion removes the press, the camera glide, auto-rotate, the ID card settle and tilt, the logo typing in, and the hero blink.

## 3D and the Exeku Lab app

- Arduino/MCU simulation, 3D design and printable cases belong to a separate desktop/mobile app, Exeku Lab. The website only promotes it: `components/lab/lab-app-banner.tsx` (landing showcase and a slim dashboard strip). Download links live in `lib/lab-app.ts`; an empty URL shows "coming soon".
- 3D on the site: `lib/three/arena.ts` (hero, shared players and projector), `lib/three/journey.ts` (team round and podium for the tour), `lib/three/circuit.ts` (Arduino Uno, breadboard, LED, resistor, wires to real millimetres, used in the Lab banner), `lib/three/stage.ts` (renderer, lighting, shadows, pauses off screen). React wrappers: `components/landing/versus-scene.tsx`, `components/lab/circuit-view.tsx`. three.js loads only when they mount.
- CAD models (for example from GrabCAD) can replace the Uno or breadboard through `public/models/manifest.json`; check each model's license first.
- Every 3D view has a `role="img"` label and a text fallback when WebGL is off.
- Performance rules for 3D: no per-object lights (screens and LEDs glow with emissive/basic materials; at most one point light per zone), run `mergeStatic` on built scenes so they render in a few draw calls, mark moving parts with `userData.dynamic`, start offscreen scenes with `useNearViewport`, and hide zones the camera can't see. `createStage` re-renders shadows only when the key light moves, adapts resolution to frame time and falls back to 30 fps on slow devices. No `backdrop-blur` over a 3D canvas.

## Components

- `components/ui`: `Button` (default, outline, ghost, secondary, destructive; `data-variant` drives the key style), `Dialog`, `Input`, `Sheet`.
- `components/app/difficulty-badge.tsx`: Easy/Medium/Hard chip.
- Code editor: `components/app/code-editor.tsx`, a transparent native `<textarea>` over a highlighted copy (`lib/syntax.ts`, VS Code Dark+). Tab indents, Shift+Tab outdents, Enter keeps indentation, Ctrl/Cmd+Enter runs, Ctrl/Cmd+Shift+Enter submits, Esc then Tab leaves the editor.
- Icons: lucide-react, imported directly; `.lucide` in `globals.css` sets the 1.8 stroke. Icon-only buttons need `aria-label`. No emoji as icons.
- Focus: 2px outline in `--color-ring`, 2px offset.

## Do's and Don'ts

- Do keep one orange action per area (Run is outline, Submit is primary).
- Do show real data only. Demo features say "Demo" on the result itself.
- Don't add decorative status pills ("Online preview", "Live", "V1", "Step 01"). Labels must carry information.
- Don't add a light theme, a second accent color, neon, scanlines or pixel corners.
- Don't load anything from a CDN. The app, fonts, three.js and models must work offline. The one exception is Clerk's sign-in script on `/setup` and `/app`, so never add `ClerkProvider` to the root layout.
- Don't use `alert()`; use a `Dialog`.

## Skills

UI work follows `impeccable` (vendored) and the ux-ui-agent-skills kit (github.com/plugin87/ux-ui-agent-skills, install with `npx ux-ui-agent-skills init`; not vendored).
