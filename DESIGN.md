---
name: Exeku
description: Black-and-white coding practice and judging workspace. Your Code. Your Machine.
colors:
  canvas: "#fafafa"
  surface: "#ffffff"
  elevated: "#f4f4f5"
  border: "#e4e4e7"
  text: "#18181b"
  text-muted: "#52525b"
  text-dim: "#71717a"
  primary: "#18181b"
  primary-foreground: "#ffffff"
  ring: "#52525b"
  dark-canvas: "#09090b"
  dark-surface: "#111113"
  dark-elevated: "#27272a"
  dark-border: "#343438"
  dark-text: "#fafafa"
  dark-text-muted: "#a1a1aa"
  dark-primary: "#fafafa"
  dark-primary-foreground: "#18181b"
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

Exeku is a tool for writing and judging code. The interface is black and white, built on shadcn/ui, and stays quiet so the code is the loudest thing on screen. Most screens are "Operate" surfaces: scanability and consistency win over expression. The landing page is the only "Persuade" surface.

## Colors

- Only neutral zinc tokens. Light mode is near-white canvas with white cards; dark mode is near-black canvas with dark cards.
- Use the CSS variables, never raw hex in components: `--color-canvas`, `--color-surface`, `--color-elevated`, `--color-border`, `--color-text-main`, `--color-text-muted`, `--color-text-dim`, `--color-primary`, `--color-primary-foreground`, `--color-ring`. Tailwind aliases: `bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`.
- There is no accent color. `--color-accent`, `--color-mint` and `--color-pink` exist only for old components and resolve to neutral text color.
- Status (Accepted, Wrong Answer, Compile Error, sandbox offline) is shown with a word, a short code (AC, WA, CE, RE, TLE) and an icon. Pass is a filled badge; fail is an outlined badge. Never rely on color.
- High contrast mode swaps borders and muted text to pure black or white.

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
- Code editor: `components/app/code-editor.tsx`, a native `<textarea>` with a line-number gutter. Tab indents, Shift+Tab outdents, Enter keeps indentation, Ctrl/Cmd+Enter runs, Ctrl/Cmd+Shift+Enter submits, Esc then Tab leaves the editor.
- Icons: Doticons via `DotIcon`. Icon-only buttons need `aria-label`.
- Focus: 2px outline in `--color-ring`, 2px offset.

## Do's and Don'ts

- Do keep one primary action per area (Run is outline, Submit is primary).
- Do show real data only. Demo results must say "Demo" on the result itself.
- Don't add color, gradients, glows, scanlines, pixel corners or neon.
- Don't load anything from a CDN. The app must work offline.
- Don't use `alert()`; use a `Dialog`.
