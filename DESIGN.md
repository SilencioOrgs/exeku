---
name: Exeku
description: Dark, orange-on-black coding practice and judging workspace in the spirit of LeetCode, with a VS Code-style editor and a 3D Hardware Lab. Your Code. Your Machine.
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

Exeku is where students practice code, compete, and build hardware. It looks like LeetCode at night: black surfaces, one orange accent, Easy/Medium/Hard colors everyone recognizes, and code colored like VS Code Dark+. It is dark only; there is no light theme.

Most screens are "Operate" surfaces (problems, workspace, settings): scanability wins. The landing page and the Hardware Lab are allowed more expression: the live 3D board, the scroll tour, orange glows.

## Colors

- Near-black neutrals for surfaces (`--color-canvas` #0a0a0a, `--color-surface` #121212, `--color-elevated` #1a1a1a) and warm white text.
- One orange (`--color-primary` #ffa116, LeetCode orange) for primary buttons, the active nav item, focus rings, progress and highlights. Orange buttons use black text. Orange text uses `--color-primary-text` (#ffb84d).
- `.text-gradient-orange` is for one headline word on the landing page, nowhere else.
- Difficulty: `--color-easy`, `--color-medium`, `--color-hard` with `-bg` chip fills, always with the word via `DifficultyBadge`.
- Green (`--color-mint`) and red (`--color-pink`) only for verdicts, errors and destructive actions, always with a word (AC Accepted, WA Wrong answer).
- Tiles (`.tile-*`) are black surfaces lit by a faint orange glow from one corner. `.bg-grid` draws a subtle 48px grid behind 3D scenes and heroes.
- High contrast mode switches to pure black, white borders and brighter text. Every text/background pair is tested at 4.5:1 (7:1 in high contrast) in `tests/appearance-contrast.test.mjs`.
- Use the CSS variables, never raw hex, in components (3D materials and illustrations are the exception).

## Typography

- Geist Sans for UI and headings; Geist Mono for code, numbers, test counts and step kickers ("01 · Write"). Both ship through the `geist` npm package.
- Big, tight headlines on the landing page (`tracking-tight`, up to `text-7xl`); app pages stay at `text-3xl` and below.
- Sentence case. No ALL CAPS labels, no `[BRACKET]` labels, no trailing `_` cursors, no em dashes in UI copy.

## Layout

- App shell: sidebar (Overview, Challenges, Workspace, Hardware Lab, Profile, Settings) + top bar.
- Dashboard: bento tiles (Continue coding, Hardware Lab with "Click to simulate", problems, chassis).
- Problems: LeetCode-style table with difficulty count cards, rounded search and pill filters.
- Landing: hero (headline left; on the right a 3D arena where two students code head to head under a holographic VS scoreboard), Practice (editor demo), the pinned scroll tour (`#tour`, five steps: write, wire, run, organize, print: the breadboard prototype becomes a finished desk clock), then About, Languages, Roadmap, Install, FAQ.

## Depth

- Cards lift with `--shadow-raised` (a hairline top highlight and a soft black drop), 14px radius.
- Inputs sink with `--shadow-inset` on the canvas color.
- Buttons are subtle keys: a faint top highlight and a 1px press on `:active`. The orange button glows (`--glow-primary`) on hover. Ghost buttons stay flat.
- Reduced motion removes the press, the camera glide, auto-rotate and the hero blink.

## 3D Hardware Lab

- Prototype parts are modeled in code to real dimensions in `lib/three/circuit.ts`: Arduino Uno R3 (68.6 × 53.4 mm, with headers, ATmega328P, USB-B, barrel jack, silkscreen), 400-point half breadboard, 5 mm LED, 220 Ω resistor and jumper wires.
- The chassis is shown as a finished product, not a breadboard in a box: `lib/three/clock.ts` is an Arduino desk clock (110 × 62 × 48 mm printed case, live 4-digit display, buttons, buzzer grille, USB port) whose lid swings open to show the parts organized on a carrier board (Nano, DS3231, TM1637, buzzer). Sizes and parts live in `lib/three/clock-spec.ts`.
- `lib/three/arena.ts` is the hero scene: stylized, faceless players in centimetres, laptops showing code, and a holographic scoreboard.
- `lib/three/stage.ts` sets up the renderer: ACES tone mapping, studio lighting with an orange rim light, soft shadows, and a render loop that pauses off screen.
- React wrappers: `components/lab/circuit-view.tsx` (prototype), `components/lab/clock-view.tsx` (finished build), `components/landing/versus-scene.tsx` (hero). three.js loads only when they mount.
- CAD models (for example from GrabCAD) can replace the Uno or breadboard through `public/models/manifest.json`; see `public/models/README.md`. Check each model's license first.
- Every 3D view has a `role="img"` label describing what it shows and a text fallback when WebGL is off.

## Components

- `components/ui`: `Button` (default, outline, ghost, secondary, destructive; `data-variant` drives the key style), `Dialog`, `Card`, `Input`, `Tooltip`, `Sheet`, `Separator`, `Skeleton`.
- `components/app/difficulty-badge.tsx`: Easy/Medium/Hard chip.
- Code editor: `components/app/code-editor.tsx`, a transparent native `<textarea>` over a highlighted copy (`lib/syntax.ts`, VS Code Dark+). Tab indents, Shift+Tab outdents, Enter keeps indentation, Ctrl/Cmd+Enter runs, Ctrl/Cmd+Shift+Enter submits, Esc then Tab leaves the editor.
- Icons: lucide-react via `DotIcon`. Icon-only buttons need `aria-label`. No emoji as icons.
- Focus: 2px outline in `--color-ring`, 2px offset.

## Do's and Don'ts

- Do keep one orange action per area (Run is outline, Submit is primary).
- Do show real data only. Demo and preview features say "Demo" or "Preview" on the result itself.
- Don't add a light theme, a second accent color, neon, scanlines or pixel corners.
- Don't load anything from a CDN. The app, fonts, three.js and models must work offline.
- Don't use `alert()`; use a `Dialog`.

## Skills

UI work follows `impeccable` (vendored) and the ux-ui-agent-skills kit (github.com/plugin87/ux-ui-agent-skills, install with `npx ux-ui-agent-skills init`; not vendored).
