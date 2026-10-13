# Exeku Phase 2C — Appearance Studio Specification

> **Status:** Planned Specification (To be implemented in Phase 2C). Do not implement code in Phase 2B.

## 1. Overview & Objectives

Exeku will introduce the **Appearance Studio** in Phase 2C, allowing students, educators, and developers to customize the platform's visual presentation to match their cognitive, ergonomic, and aesthetic preferences.

Rather than duplicating page layouts, the Appearance Studio will drive styling through **semantic CSS tokens** and modular design primitives.

---

## 2. Core Aesthetic Themes

The platform will support three distinct design personalities:

### 1. Pixel Arcade (Default)
- **Vibe:** Retro nostalgic 8-bit/16-bit developer terminal with high contrast and tactile feedback.
- **Palette:** Dark violet foundation (`#090514`), deep purple surfaces (`#120A24`), neon cyan (`#00F0FF`), neon purple (`#9E00FF`), and neon pink (`#FF007A`).
- **Typography:** Pixelify Sans for headings and retro badges, Geist Sans for body, Geist Mono for code.
- **Decorations:** Crisp pixel borders, hard drop shadows, and official Doticons pixel icons.

### 2. Minimal SaaS
- **Vibe:** Clean, modern, distraction-free product interface optimized for long study sessions.
- **Palette:** Refined slate and obsidian darks with muted indigo and sapphire focus accents; crisp neutral whites in light mode.
- **Typography:** Inter or Geist Sans for headings and body; Geist Mono for code.
- **Decorations:** Subtle 1px borders, smooth radiuses (`rounded-md`), restrained soft shadows.

### 3. Studio / CRM
- **Vibe:** Information-dense, compact, high-efficiency engineering console.
- **Palette:** Deep industrial charcoal with high-legibility amber and emerald telemetry accents.
- **Typography:** Monospace-forward headings and tabular figures.
- **Decorations:** Ultra-compact padding, tight row heights, collapsed headers, and maximize-editor modes.

---

## 3. Ergonomic & Accessibility Preferences

The Appearance Studio will provide fine-grained controls stored in user preferences:

1. **Color Modes**:
   - `Dark` (default)
   - `Light`
   - `System` (follows OS color preference)
2. **Surface Brightness**:
   - `Pitch Black` (OLED / high battery efficiency)
   - `Deep Violet` (default arcade tone)
   - `Muted Slate` (low glare)
3. **Typography & Font Sizing**:
   - UI Font Size: `Compact (13px)`, `Standard (14px)`, `Comfortable (16px)`, `Large (18px)`.
   - Monaco Editor Font Size: `12px` to `20px` with live slider.
   - Line Height: `Tight (1.25)`, `Standard (1.5)`, `Relaxed (1.75)`.
4. **Visual Accessibility**:
   - `High Contrast Mode`: Enforces WCAG AAA compliance, solid borders, and removes subtle alpha channels.
   - `Reduced Motion`: Disables decorative pulse animations, marquee effects, and transitions.
5. **Live Landing Page Theme Selector**:
   - Interactive preview pill on the public landing page showcasing each theme in real-time before entering the app.

---

## 4. Implementation Architecture (Semantic Token Model)

In Phase 2C, Tailwind CSS v4 variables in `app/globals.css` will be mapped to semantic tokens:

```css
[data-theme="pixel-arcade"] {
  --color-canvas: #090514;
  --color-surface: #120A24;
  --color-border: #2E1A57;
  --color-accent: #00F0FF;
  --font-heading: var(--font-pixelify);
}

[data-theme="minimal-saas"] {
  --color-canvas: #0B0F19;
  --color-surface: #111827;
  --color-border: #1F2937;
  --color-accent: #3B82F6;
  --font-heading: var(--font-geist-sans);
}

[data-theme="studio-crm"] {
  --color-canvas: #0A0A0A;
  --color-surface: #141414;
  --color-border: #262626;
  --color-accent: #10B981;
  --font-heading: var(--font-geist-mono);
}
```

This guarantees 100% component reuse across `/app/workspace`, `/app/challenges`, `/app/progress`, and `/app/settings`.
