---
name: Exeku
description: Blue-and-white coding practice and judging workspace with a VS Code-style editor. Your Code. Your Machine.
colors:
  canvas: "#f8fafc"
  surface: "#ffffff"
  elevated: "#f1f5f9"
  border: "#e2e8f0"
  text: "#0f172a"
  text-muted: "#475569"
  primary: "#2563eb"
  primary-hover: "#1d4ed8"
  primary-foreground: "#ffffff"
  link: "#1d4ed8"
  pass: "#15803d"
  fail: "#b91c1c"
  dark-canvas: "#0b1120"
  dark-surface: "#0f172a"
  dark-elevated: "#1e293b"
  dark-border: "#334155"
  dark-text: "#f8fafc"
  dark-text-muted: "#94a3b8"
  dark-link: "#60a5fa"
  dark-pass: "#4ade80"
  dark-fail: "#f87171"
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
    fontSize: "0.875rem"
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
  lg: "12px"
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
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.code}"
---

# Exeku design system

## Overview

Exeku is a tool for writing and judging code. The interface is blue and white, built on shadcn/ui, with a light and a dark mode (light is the default). The code editor uses VS Code's Light+ and Dark+ colors so it feels familiar to competitive programmers. Most screens are "Operate" surfaces: scanability and consistency win over expression. The landing page is the only "Persuade" surface.

## Colors

- Slate neutrals for surfaces and text; one blue (`--color-primary` #2563eb) for primary buttons, links, focus rings and the active nav item. Use the CSS variables, never raw hex in components.
- Tokens: `--color-canvas`, `--color-surface`, `--color-elevated`, `--color-border`, `--color-text-main`, `--color-text-muted`, `--color-primary`, `--color-primary-text` (links and blue text), `--color-ring`.
- Green (`--color-mint`) and red (`--color-pink`) are only for meaning: Accepted vs a failed verdict, errors, destructive actions. Verdicts always show the code and the word too (AC Accepted, WA Wrong answer).
- Code editor colors live in `.code-editor[data-theme-scope]` (`--tok-keyword`, `--tok-string`, ...) and follow VS Code Light+/Dark+, including bracket pair colors.
- Appearance offers only Light and Dark, plus code font size, text size, high contrast and reduced motion under "More options".

## Typography

- Geist Sans for UI and headings; Geist Mono for code, input/output, numbers and time. Both ship through the `geist` npm package.
- Sentence case everywhere. No ALL CAPS labels, no `[BRACKET]` labels, no trailing `_` cursors.
- Smallest text is 12px (`text-xs`). Do not use 9–11px text.

## Layout

- App shell: sidebar + top bar, content max width 94rem.
- Workspace: three resizable panes (problem, editor, output) on desktop (`xl` and up), a three-tab switcher below that. Layout modes: split, wide, focus.
- Spacing on a 4px grid; panes use 8–16px padding.

## Elevation & Depth

Flat. No shadows on cards or buttons. Depth comes from a 1px border and the canvas/surface/elevated steps. Dialogs use a dimmed backdrop.

## Shapes

Buttons and inputs 8px radius, cards and dialogs 12px, small badges 6px. Borders are always 1px.

## Components

- Use `components/ui`: `Button` (default, outline, ghost, secondary, destructive; sizes xs, sm, default, icon), `Dialog`, `Card`, `Input`, `Tooltip`, `Sheet`, `Separator`, `Skeleton`.
- Code editor: `components/app/code-editor.tsx`, a transparent native `<textarea>` over a highlighted copy (`lib/syntax.ts`), with a line-number gutter and current-line highlight. Tab indents, Shift+Tab outdents, Enter keeps indentation, Ctrl/Cmd+Enter runs, Ctrl/Cmd+Shift+Enter submits, Esc then Tab leaves the editor.
- Icons: lucide-react via `DotIcon`. Icon-only buttons need `aria-label`.
- Focus: 2px outline in `--color-ring`, 2px offset.

## Do's and Don'ts

- Do keep one primary action per area (Run is outline, Submit is primary).
- Do show real data only. Demo results must say "Demo" on the result itself.
- Don't add extra accent colors, gradients, glows, scanlines, pixel corners or neon. Blue is the only brand color.
- Don't load anything from a CDN. The app must work offline.
- Don't use `alert()`; use a `Dialog`.
