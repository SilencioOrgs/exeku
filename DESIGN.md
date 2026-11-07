---
name: Exeku
description: Pastel, skeuomorphic coding practice and judging workspace with a LeetCode-style orange accent, a VS Code-style editor and a Hardware Lab. Your Code. Your Machine.
colors:
  canvas: "#fbf6ef"
  surface: "#fffdfa"
  elevated: "#f5ede2"
  border: "#e8dccb"
  text: "#2b2118"
  text-muted: "#5c4f42"
  primary: "#ffa116"
  primary-edge: "#d27f00"
  primary-foreground: "#2b2118"
  link: "#9a4a06"
  ring: "#c2410c"
  easy: "#0b6e64"
  medium: "#8a5a00"
  hard: "#be123c"
  pass: "#15703a"
  fail: "#be123c"
  tint-peach: "#ffe8d6"
  tint-mint: "#dcf5e8"
  tint-lavender: "#ebe5fb"
  tint-sky: "#ddeefc"
  tint-butter: "#fff3c4"
  dark-canvas: "#1a1a1a"
  dark-surface: "#262626"
  dark-elevated: "#303030"
  dark-border: "#3e3e3e"
  dark-text: "#eceae6"
  dark-text-muted: "#a8a49e"
  dark-link: "#ffb84d"
  dark-easy: "#00b8a3"
  dark-medium: "#ffc01e"
  dark-hard: "#ff8a9a"
  editor-light-bg: "#ffffff"
  editor-dark-bg: "#1e1e1e"
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
    backgroundColor: "{colors.editor-light-bg}"
    textColor: "{colors.text}"
    typography: "{typography.code}"
---

# Exeku design system

## Overview

Exeku is a place for students to practice code, compete, and (soon) build hardware. It should feel like LeetCode made friendly: a problem list you can scan in a second, Easy/Medium/Hard colors everyone recognizes, one orange accent, and soft pastel, slightly tactile surfaces. The code editor uses VS Code's Light+ and Dark+ colors so it feels familiar.

Most screens are "Operate" surfaces (problems, workspace, settings): scanability wins. The landing page and the Hardware Lab are allowed more expression (bento tiles, illustrations, the 3D chassis).

The look applies everywhere, including the landing page, in light (default) and dark.

## Colors

- Warm neutrals for surfaces and text, one orange (`--color-primary` #ffa116, LeetCode orange) for primary keys, the active nav item and focus. Orange keys use dark text (`--primary-foreground`) for contrast.
- Links and orange text use `--color-primary-text` (#9a4a06 light, #ffb84d dark) so they pass 4.5:1.
- Difficulty: `--color-easy`, `--color-medium`, `--color-hard` with `-bg` chip fills. Always show the word (Easy, Medium, Hard) via `DifficultyBadge`.
- Pastel tiles (`.tile-peach`, `.tile-mint`, `.tile-lavender`, `.tile-sky`, `.tile-butter`, from `--tint-*`) group dashboard and Lab content. Use one tile color per card, never as text color.
- Green (`--color-mint`) and red (`--color-pink`) are only for verdicts, errors and destructive actions, always with a word (AC Accepted, WA Wrong answer).
- Code editor colors live in `.code-editor[data-theme-scope]` (`--tok-keyword`, `--tok-string`, ...) and follow VS Code Light+/Dark+, including bracket pair colors.
- Breadboard illustration colors use `--bb-*` tokens so it adapts to dark mode.
- Every text/background pair is checked at 4.5:1 or better in light, dark and high contrast. Use the CSS variables, never raw hex in components (illustrations and the 3D scene are the exception).

## Typography

- Geist Sans for UI and headings; Geist Mono for code, input/output, numbers, test counts and time. Both ship through the `geist` npm package.
- Sentence case everywhere. No ALL CAPS labels, no `[BRACKET]` labels, no trailing `_` cursors, no em dashes in UI copy.
- Smallest text is 12px (`text-xs`).

## Layout

- App shell: sidebar (Overview, Challenges, Workspace, Hardware Lab, Profile, Settings) + top bar.
- Dashboard: a bento grid of pastel tiles (Continue coding, Hardware Lab with "Click to simulate", problems, chassis).
- Problems: LeetCode-style table (#, Title + tags, Topic, Difficulty, Tests, actions) with difficulty count cards, a rounded search field and pill filter chips.
- Workspace: three resizable panes (problem, editor, output) on desktop (`xl` and up), a tab switcher below that.
- Hardware Lab: sketch editor + breadboard scene + serial monitor, then the 3D chassis and the roadmap tiles.
- Spacing on a 4px grid.

## Elevation & Depth (skeuomorphism, kept soft)

- Cards are raised: `--shadow-raised` (a soft drop shadow plus a 1px inner highlight), 14px radius.
- Inputs are recessed: `--shadow-inset`.
- Buttons are keycaps: a light top highlight, a 2px bottom edge (`--color-key-edge`, orange keys use `--color-primary-edge`), and they press down 2px on `:active`. Ghost buttons stay flat. Apply `.skeuo-key` to custom controls that should look pressable.
- Reduced motion removes the press movement and 3D auto-rotate.
- No glossy gradients, no textures, no glows except the LED.

## Shapes

Buttons and inputs 8px, cards 14px, bento tiles 16px, chips and search field fully rounded. Borders are 1px.

## Components

- `components/ui`: `Button` (default, outline, ghost, secondary, destructive; `data-variant` drives the keycap style), `Dialog`, `Card`, `Input`, `Tooltip`, `Sheet`, `Separator`, `Skeleton`.
- `components/app/difficulty-badge.tsx`: Easy/Medium/Hard chip.
- Code editor: `components/app/code-editor.tsx`, a transparent native `<textarea>` over a highlighted copy (`lib/syntax.ts`). Tab indents, Shift+Tab outdents, Enter keeps indentation, Ctrl/Cmd+Enter runs, Ctrl/Cmd+Shift+Enter submits, Esc then Tab leaves the editor.
- Hardware Lab: `components/lab/breadboard-scene.tsx` (SVG Uno + breadboard + LED), `breadboard-sim.tsx` (sketch runner via `lib/lab/blink.ts`), `chassis-preview.tsx` (Three.js, loaded on demand, sized in real millimetres).
- Icons: lucide-react via `DotIcon`. Icon-only buttons need `aria-label`. No emoji as icons.
- Focus: 2px outline in `--color-ring`, 2px offset.

## Do's and Don'ts

- Do keep one primary (orange) action per area (Run is outline, Submit is primary).
- Do show real data only. Demo and preview features say "Demo" or "Preview" on the result itself.
- Do vary tile colors across a grid; don't repeat the same tint side by side.
- Don't add more accent colors, neon, scanlines or pixel corners. Orange is the only brand color; pastels are surfaces.
- Don't load anything from a CDN. The app, fonts and Three.js must work offline.
- Don't use `alert()`; use a `Dialog`.

## Skills

UI work follows `impeccable` (vendored) and the ux-ui-agent-skills kit (github.com/plugin87/ux-ui-agent-skills, install with `npx ux-ui-agent-skills init`; not vendored). Its skeuomorphism and "Warm Soft-SaaS" guides informed this system.
