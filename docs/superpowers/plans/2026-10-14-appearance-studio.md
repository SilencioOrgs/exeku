# Exeku Phase 2C — Appearance Studio & Global Theming Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Exeku's complete Appearance Studio and global theming engine supporting 3 visual styles (Pixel Arcade, Minimal SaaS, Studio / CRM), Light/Dark/System modes, typography & font scaling, high contrast, perceived brightness, reduced motion, Monaco editor theme integration, landing page theme switcher, and persistent settings in IndexedDB/localStorage without hydration flash.

**Architecture:** 
- Centralized appearance state managed via `lib/storage/appearance-repository.ts` and `hooks/use-appearance.tsx`.
- Semantic CSS tokens in `app/globals.css` bound to `data-ui-style`, `data-color-mode`, `data-contrast`, `data-font-size`, `data-line-height`, and `data-reduced-motion` attributes on `<html>`.
- Zero-FOUC anti-flash script in `app/layout.tsx` resolving preferences synchronously from storage before React hydration.
- Shared UI primitives (`PixelCard`, `PixelButton`, `PixelBadge`) styled with semantic tokens and theme-aware CSS.
- Monaco editor themes (`exeku-dark`, `exeku-light`, `exeku-hc-dark`, `exeku-hc-light`, minimal and studio variants) dynamically updated without remounting.
- Interactive Appearance Studio panel in `/app/settings` with live preview and landing page navbar theme selector.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, Monaco Editor, Doticons, Lucide Icons, Node test runner.

**Spec:** `docs/superpowers/specs/2026-10-14-appearance-studio-spec.md`

## Global Constraints

- **No Project Reinitialization:** Preserve existing Next.js, Tailwind v4, shadcn/ui, and Monaco setup.
- **No Insecure Execution or Regressions:** Do not touch Phase 2B judging engine, sandbox adapter, problem catalog, or test suite.
- **Zero Component Duplication:** Do not duplicate full pages for each style; use shared components and CSS variable tokens.
- **Zero Data Loss:** Switching themes or font scales must never erase Monaco editor code drafts or reset user state.
- **No FOUC / Theme Flash:** Theme attributes must be mounted to `<html>` synchronously to prevent white/dark flashes.
- **Guest-Safe Persistence:** Theme preferences must work for visitors on landing page prior to profile creation, restoring seamlessly upon return.

## Review Focus

1. **Hydration Mismatch & Theme Flash:** Server renders default markup, but client storage has custom theme. Must use anti-flash inline script and `suppressHydrationWarning` on `<html>`.
2. **Monaco State Preservation on Theme Switch:** Changing font size, family, or color mode must update editor options without re-instantiating editor instance or losing cursor/buffer.
3. **Contrast Compliance in High Contrast Mode:** Text must meet WCAG AAA requirements with solid 2px borders and visible focus rings.
4. **App Brightness Isolation:** Brightness adjustment must only scale CSS surface/canvas color tokens without using global `filter: brightness()` that washes out text and images.
5. **Storage Resilience:** In incognito or restricted environments where `localStorage` throws, system must fall back to in-memory state gracefully without throwing unhandled exceptions.

---

### Task 1: Appearance Types, Schema Validation & Storage Repository (TDD)

**Files:**
- Create: `types/appearance.ts`
- Create: `lib/storage/appearance-repository.ts`
- Create: `tests/appearance-storage.test.mjs`

**Interfaces:**
- Consumes: None
- Produces: `types/appearance.ts` (`UIStyle`, `ColorMode`, `ContrastMode`, `UIFontFamily`, `EditorFontFamily`, `LineHeightOption`, `AppearancePreferences`), `appearanceRepository` (`getPreferences()`, `savePreferences()`, `resetPreferences()`, `resolveEffectiveColorMode()`)

- [ ] **Step 1: Write failing appearance storage and validation tests**
  Create `tests/appearance-storage.test.mjs` testing:
  - Default preferences initialization (`pixel-arcade`, `dark`, `standard` contrast, `100%` UI font scale, `14px` editor font).
  - Validation of UI style whitelists (`pixel-arcade`, `minimal-saas`, `studio-crm`).
  - Validation of color mode whitelists (`dark`, `light`, `system`).
  - Clamping of UI font scale (80% to 150%) and brightness (80% to 120%).
  - Clamping of Monaco font size (12px to 20px).
  - Storage persistence and retrieval with fallback when storage throws.
  - Reset to defaults preserving valid defaults.

- [ ] **Step 2: Run test to verify it fails**
  Run: `npx.cmd tsx --test tests/appearance-storage.test.mjs`
  Expected: FAIL (modules not found).

- [ ] **Step 3: Implement `types/appearance.ts` and `lib/storage/appearance-repository.ts`**
  Implement typed definitions, preference normalization, clamping logic, safe `localStorage` with in-memory fallback, and custom event broadcasting (`exeku:appearance-changed`).

- [ ] **Step 4: Run tests to verify pass**
  Run: `npx.cmd tsx --test tests/appearance-storage.test.mjs`
  Expected: PASS.

- [ ] **Step 5: Commit Task 1**
  ```bash
  git add types/appearance.ts lib/storage/appearance-repository.ts tests/appearance-storage.test.mjs
  git commit -m "feat(appearance): implement appearance types, schema validation, and storage repository"
  ```

---

### Task 2: Semantic CSS Tokens & Global Theming Foundation in `app/globals.css`

**Files:**
- Modify: `app/globals.css`
- Create: `hooks/use-appearance.tsx`
- Modify: `app/layout.tsx`

**Interfaces:**
- Consumes: `appearanceRepository`, `AppearancePreferences`
- Produces: Semantic CSS variables for `--color-canvas`, `--color-surface`, `--color-elevated`, `--color-border`, `--color-accent`, `--radius-card`, `--radius-btn`, `--shadow-card`, `--font-heading`, and `useAppearance()` hook.

- [ ] **Step 1: Define semantic CSS token rules in `app/globals.css`**
  - Add root variables and theme selectors:
    - `[data-ui-style="pixel-arcade"]`: Dark violet canvas, purple surfaces, neon accents, 0px radius, chunky 4px box-shadows, pixel font heading.
    - `[data-ui-style="minimal-saas"]`: Neutral slate darks (`#0B0F19`/`#111827`) or clean light surfaces (`#F8FAFC`/`#FFFFFF`), rounded borders (`--radius-card: 10px`), subtle shadows, modern font heading.
    - `[data-ui-style="studio-crm"]`: Industrial dark charcoal (`#0A0A0A`/`#141414`), emerald/amber accents, 2px radius, compact padding, monospace heading.
  - Add light mode overrides for each style when `[data-color-mode="light"]`.
  - Add high contrast overrides for each style when `[data-contrast="high"]` (solid 2px high-visibility borders, WCAG AAA text).
  - Add font scale rules (`--ui-font-scale`), line height rules, and brightness scaling.
  - Add reduced-motion rules (`[data-reduced-motion="true"] * { animation-duration: 0.001ms !important; transition-duration: 0.001ms !important; }`).

- [ ] **Step 2: Implement `hooks/use-appearance.tsx`**
  Create React Context provider `AppearanceProvider` and hook `useAppearance()` that:
  - Mounts active preferences.
  - Updates HTML attributes on `document.documentElement` (`data-ui-style`, `data-color-mode`, `data-contrast`, `data-reduced-motion`, etc.).
  - Applies CSS custom properties for brightness and font scale.
  - Listens to OS `prefers-color-scheme` and `prefers-reduced-motion` changes when in `system` mode.
  - Listens to cross-tab storage changes.

- [ ] **Step 3: Update `app/layout.tsx` with anti-flash script**
  - Add `suppressHydrationWarning` to `<html>`.
  - Add inline `<script>` in `<head>` that reads `localStorage.getItem("exeku_appearance_settings")` and assigns initial dataset attributes before rendering to prevent white/dark flashes.
  - Wrap body children in `<AppearanceProvider>`.

- [ ] **Step 4: Typecheck and test**
  Run: `npx.cmd tsc --noEmit` and `npm.cmd run lint`.
  Expected: PASS.

- [ ] **Step 5: Commit Task 2**
  ```bash
  git add app/globals.css hooks/use-appearance.tsx app/layout.tsx
  git commit -m "feat(theme): configure semantic CSS tokens, appearance provider, and anti-flash script"
  ```

---

### Task 3: Theme-Aware Modular Component Primitives (`PixelCard`, `PixelButton`, `PixelBadge`)

**Files:**
- Modify: `components/retro/pixel-card.tsx`
- Modify: `components/retro/pixel-button.tsx`
- Modify: `components/retro/pixel-badge.tsx`

**Interfaces:**
- Consumes: CSS variables `--color-surface`, `--color-elevated`, `--color-border`, `--radius-card`, `--radius-btn`, `--shadow-card`, `--shadow-btn`.
- Produces: Reusable UI cards, buttons, and badges that dynamically adapt their corner marks, borders, radiuses, and shadows based on active theme without code duplication.

- [ ] **Step 1: Update `components/retro/pixel-card.tsx`**
  - Utilize CSS custom properties for surface colors and borders.
  - Wrap decorative pixel corner marks in `pixel-corner-mark` class, hidden automatically in `minimal-saas` and `studio-crm` via CSS.
  - Respect `--radius-card` and `--shadow-card`.

- [ ] **Step 2: Update `components/retro/pixel-button.tsx`**
  - Adapt buttons to use `--radius-btn` and `--shadow-btn`.
  - In `pixel-arcade`, maintain uppercase arcade tactile feel.
  - In `minimal-saas`, render smooth rounded buttons with subtle focus rings.
  - In `studio-crm`, render dense, crisp technical buttons.

- [ ] **Step 3: Update `components/retro/pixel-badge.tsx`**
  - Adapt badges to use theme-aware borders and radius.
  - Hide square brackets `[` and `]` in `minimal-saas` mode for cleaner typography.

- [ ] **Step 4: Typecheck and lint**
  Run: `npx.cmd tsc --noEmit` and `npm.cmd run lint`.
  Expected: 0 errors.

- [ ] **Step 5: Commit Task 3**
  ```bash
  git add components/retro/pixel-card.tsx components/retro/pixel-button.tsx components/retro/pixel-badge.tsx
  git commit -m "feat(ui): adapt cards, buttons, and badges to semantic theme design tokens"
  ```

---

### Task 4: Monaco Editor Multi-Theme Integration

**Files:**
- Modify: `components/app/monaco-editor-pane.tsx`
- Modify: `components/app/workspace-view.tsx`

**Interfaces:**
- Consumes: `useAppearance()` hook, `AppearancePreferences`
- Produces: Dynamic Monaco editor theme synchronization (`exeku-pixel-dark`, `exeku-pixel-light`, `exeku-minimal-dark`, `exeku-minimal-light`, `exeku-studio-dark`, `exeku-studio-light`, and high contrast themes) with font size, line height, and font family updates.

- [ ] **Step 1: Enhance `components/app/monaco-editor-pane.tsx`**
  - Register complete syntax color palettes for all 3 themes in both Dark, Light, and High Contrast variations.
  - Use `monaco.editor.setTheme()` to switch themes dynamically when preferences change without re-rendering or unmounting.
  - Use `editor.updateOptions()` to update `fontSize`, `lineHeight`, `fontFamily` live.
  - Maintain active buffer, undo/redo history, and cursor state.

- [ ] **Step 2: Verify zero state loss**
  Ensure code buffer is never reset when theme, font size, or color mode changes.

- [ ] **Step 3: Typecheck and lint**
  Run: `npx.cmd tsc --noEmit` and `npm.cmd run lint`.
  Expected: 0 errors.

- [ ] **Step 4: Commit Task 4**
  ```bash
  git add components/app/monaco-editor-pane.tsx components/app/workspace-view.tsx
  git commit -m "feat(monaco): add dynamic theme synchronization and typography controls"
  ```

---

### Task 5: Appearance Studio Settings Section in `/app/settings`

**Files:**
- Create: `components/app/appearance-studio.tsx`
- Modify: `components/app/settings-view.tsx`

**Interfaces:**
- Consumes: `useAppearance()`, `appearanceRepository`
- Produces: Comprehensive appearance configuration panel with 3 visual style preview cards, typography controls, accessibility toggles, perceived brightness slider, reset button, and live preview.

- [ ] **Step 1: Implement `components/app/appearance-studio.tsx`**
  - Visual Style Cards: Pixel Arcade, Minimal SaaS, Studio / CRM with visual snapshots, descriptions, and active checkmarks.
  - Color Mode segmented control: Light, Dark, System.
  - Contrast Mode control: Standard vs High Contrast (WCAG AAA).
  - Typography Section: UI font family selector (`Geist Sans`, `Inter`, `Pixelify Sans`), UI font scale slider (80% to 150%), Line height options (`Compact`, `Normal`, `Comfortable`).
  - Monaco Editor Section: Editor font family (`Geist Mono`, `Consolas / Monospace`), Editor font size slider (12px to 20px), Line height slider.
  - Display & Accessibility: App brightness slider (80% to 120%), Reduced Motion toggle, Reset Appearance to Defaults button.
  - Live Theme Preview: Embedded interactive card displaying sample buttons, badges, typography, and contrast indicator in real-time.

- [ ] **Step 2: Embed into `components/app/settings-view.tsx`**
  - Add an "APPEARANCE STUDIO" section into the settings view with clean tab/segmented navigation.
  - Clean up legacy offline-only references in settings copy.

- [ ] **Step 3: Typecheck and lint**
  Run: `npx.cmd tsc --noEmit` and `npm.cmd run lint`.
  Expected: 0 errors.

- [ ] **Step 4: Commit Task 5**
  ```bash
  git add components/app/appearance-studio.tsx components/app/settings-view.tsx
  git commit -m "feat(settings): implement Appearance Studio panel with live preview and controls"
  ```

---

### Task 6: Landing Page Theme Selector in Navbar

**Files:**
- Create: `components/landing/appearance-modal.tsx`
- Modify: `components/landing/navbar.tsx`

**Interfaces:**
- Consumes: `useAppearance()`
- Produces: Accessible interactive modal/dropdown on the public landing page allowing visitors to preview all 3 visual styles before onboarding.

- [ ] **Step 1: Implement `components/landing/appearance-modal.tsx`**
  - Modal displaying 3 style cards with instant live switching on click.
  - Accessible dialog with ESC key dismiss and focus trap.

- [ ] **Step 2: Integrate into `components/landing/navbar.tsx`**
  - Add "Appearance" button in desktop navigation and mobile drawer.
  - Display current visual style badge (e.g. `[STYLE: ARCADE]`).
  - Selecting a style updates the entire landing page immediately and persists the choice so it is active when entering `/app` or `/setup`.

- [ ] **Step 3: Typecheck and lint**
  Run: `npx.cmd tsc --noEmit` and `npm.cmd run lint`.
  Expected: 0 errors.

- [ ] **Step 4: Commit Task 6**
  ```bash
  git add components/landing/appearance-modal.tsx components/landing/navbar.tsx
  git commit -m "feat(landing): add interactive appearance selector to navbar"
  ```

---

### Task 7: Full Verification Suite, Build & GitHub Delivery

**Files:**
- Audit all files, tests, and documentation.

- [ ] **Step 1: Run all unit tests**
  Run: `npx.cmd tsx --test tests/*.test.mjs`
  Expected: All tests pass (Phase 2A + Phase 2B + Phase 2C tests).

- [ ] **Step 2: Run ESLint**
  Run: `npm.cmd run lint`
  Expected: 0 errors, 0 warnings.

- [ ] **Step 3: Run TypeScript compiler**
  Run: `npx.cmd tsc --noEmit`
  Expected: 0 type errors.

- [ ] **Step 4: Run production build**
  Run: `npm.cmd run build`
  Expected: Clean build with exit code 0.

- [ ] **Step 5: Impeccable audit & mechanical detector**
  Run: `C:\Users\Asnor\.gemini\config\skills\impeccable\scripts\impeccable.cmd detect --json` (or inspect changed targets).

- [ ] **Step 6: Push, PR, and merge delivery protocol**
  - Push `feat/appearance-studio` to origin.
  - Create pull request via `gh pr create`.
  - Squash merge pull request via `gh pr merge`.
  - Synchronize local `main`.
