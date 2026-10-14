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

## Continuation rulings — 2026-10-14

- Tasks 1–4 already have commits; audit and extend them rather than repeat implementation.
- Complete Tasks 5–6 while correcting persistence, hydration, density, motion, brightness, and editor options.
- Guest preferences use existing localStorage; profile overrides extend existing IndexedDB profile records. No schema migration.
- Add system motion, density, independent editor syntax selection, ligatures, and accurate save status.
- Inter is not bundled; expose Geist Sans, Pixelify Sans, and System Sans only.
- Retain the scoped root hydration suppression for attributes deliberately changed before hydration. Child markup must hydrate from identical defaults.
- Existing staged configuration deletions remain untouched. No remote operations without explicit approval.
- Task 7 remote-delivery steps are superseded by the developer approval gate.

## Local verification report — 2026-10-14

### Implementation and architecture

Appearance Studio is implemented in `/app/settings`; the landing navigation exposes a shared style and color-mode selector. Landing, setup, overview, challenges, workspace, progress, settings, dialogs, and notifications use the centralized provider and semantic tokens. Pixel Arcade retains pixel geometry, display type, and decorations; Minimal SaaS uses clean type, rounded geometry, subdued borders, and Lucide navigation; Studio uses monospace headings, industrial colors, structured panels, and restrained decorations. Density remains an independent user preference. No dashboards or providers were duplicated, and no dependencies were added.

Guest preferences persist in localStorage. Explicit IndexedDB profile preferences take precedence; new profiles inherit guest settings and legacy profiles inherit until customized. The first-paint snapshot is a cache, not canonical storage. Profile appearance updates preserve identity, timestamps, and draft records without a database version change. Early edits merge onto loaded preferences; profile reads retry after transient failure; writes serialize and report failures honestly.

Monaco independently resolves syntax theme, font, font size, line height, ligatures, and reduced cursor motion. Runtime harness tests verify theme/option updates against the same editor reference without replacing its buffer or invoking the code-change callback. Real Monaco cursor and undo history still require browser verification.

### Verification evidence

- `npx.cmd tsx --test tests/*.test.mjs`: **85 passed, 0 failed**.
- `npm.cmd run lint`: **passed, no warnings**.
- `npx.cmd tsc --noEmit`: **passed**.
- `npm.cmd run build`: **passed**, all application and API routes compiled.
- Production bootstrap scripts extracted from built landing, setup, settings, and workspace HTML: **4 passed** with stored Studio/System preferences.
- `git diff --check`: **passed**.
- Impeccable mechanical detector across changed UI surfaces: **no findings**. This is static evidence, not visual verification.
- Theme tests measure text on canvas, surface, and elevated backgrounds across all six style/mode combinations, standard brightness endpoints, and high contrast. High-contrast Monaco tokens meet 7:1 against normal and active-line backgrounds. These checks do not establish whole-application WCAG compliance.
- Profile/draft preservation tests cover inheritance, legacy records, reset, unrelated fields, storage failure, hydration edits, serial writes, and System media changes. Real browser IndexedDB concurrency is not verified.
- Independent read-only review found hydration overwrites, missing profile-read recovery, editor font leakage into interface text, and avatar-step contrast. All were fixed. Focus-managed Sheet navigation, scalable topbar height, scoped preview surfaces, reduced root scrolling, high-contrast editor tokens, and solid high-contrast panel borders were also corrected.
- Execution, judging, problem catalogs, draft repository, and API contracts have no appearance-phase changes. Real Python, Java, C++, and C sandbox execution remains unverified.

### Decisions and limitations

- Continued on the existing feature branch to preserve its four prior implementation commits and uncommitted work; no worktree or replacement plan was created.
- Kept root-only hydration suppression because the bootstrap deliberately changes root attributes before hydration; React child markup still starts with identical defaults.
- Offered locally available Geist Sans, System Sans, Pixelify Sans, Geist Mono, Consolas, and system monospace; Inter is not bundled.
- High contrast fixes brightness to 100% while retaining the stored brightness choice.
- Fixed small review findings because reduced motion, contrast, and solid borders are explicit Phase 2C accessibility requirements. No deferred review findings remain.
- Browser inventory returned no connected browsers; screenshots, actual focus restoration, interactive persistence, touch input, and responsive layout verification were unavailable to this session. Requests present in a shared development-server log are not evidence of browser testing by this agent.
- The local server started for verification was stopped. Development logs included Next.js agent-feedback instant-navigation validation warnings for profile-gated app routes; production compilation passed. No instant-navigation configuration was changed for this phase.

### Manual browser verification still required

1. Check landing, setup, all app routes, dialogs, and navigation at 375px, 768px, 1024px, 1366×768, and 1440px. Repeat at 150% text, Compact/Spacious density, and alternative fonts; inspect wrapping and horizontal overflow.
2. Switch all styles and Light/Dark/System modes, reload, navigate, and change OS scheme/motion preferences. Verify guest inheritance, profile overrides, reset isolation, and save-error feedback.
3. Type code and custom stdin, select a problem, move the cursor, and create undo history. Repeatedly change appearance/editor settings; verify all state remains, no run/submit request fires, and all four languages still switch normally.
4. Use keyboard-only navigation, open/close appearance dialogs and mobile navigation with Escape, and check focus restoration, visible focus, screen-reader labels, and touch targets.

### Git delivery state

At completion verification, branch was `feat/appearance-studio`; local `main` and the existing `origin/main` tracking ref matched at `2e8fa3c`. No new commits or remote operations had been made. The developer subsequently approved committing Phase 2C, pushing this branch, and creating a pull request against `main`. Merge and deployment are not authorized. Pre-existing staged deletions of `.codex/hooks.json` and `.gemini/settings.json` are excluded from the appearance commit. `AGENTS.md` also contains Next.js-generated development guidance.

### Changed file manifest

- `AGENTS.md`
- `app/globals.css`
- `app/layout.tsx`
- `components/app/appearance-studio.tsx`
- `components/app/app-shell.tsx`
- `components/app/app-sidebar.tsx`
- `components/app/app-topbar.tsx`
- `components/app/app-welcome.tsx`
- `components/app/challenges-view.tsx`
- `components/app/command-station.tsx`
- `components/app/monaco-editor-pane.tsx`
- `components/app/profile-edit-dialog.tsx`
- `components/app/profile-reset-dialog.tsx`
- `components/app/progress-view.tsx`
- `components/app/settings-view.tsx`
- `components/app/workspace-view.tsx`
- `components/appearance/style-selector.tsx`
- `components/landing/about.tsx`
- `components/landing/appearance-modal.tsx`
- `components/landing/faq.tsx`
- `components/landing/features-roadmap.tsx`
- `components/landing/footer.tsx`
- `components/landing/hero.tsx`
- `components/landing/install-guide.tsx`
- `components/landing/languages.tsx`
- `components/landing/navbar.tsx`
- `components/landing/pixel-terminal.tsx`
- `components/retro/dot-icon.tsx`
- `components/retro/pixel-badge.tsx`
- `components/retro/pixel-button.tsx`
- `components/retro/pixel-card.tsx`
- `components/setup/onboarding-wizard.tsx`
- `components/setup/step-avatar.tsx`
- `components/setup/step-identity.tsx`
- `components/setup/step-loadout.tsx`
- `components/ui/sonner.tsx`
- `docs/superpowers/plans/2026-10-14-appearance-studio.md`
- `hooks/use-appearance.tsx`
- `lib/appearance-bootstrap.ts`
- `lib/editor-appearance.ts`
- `lib/storage/appearance-repository.ts`
- `lib/storage/db.ts`
- `lib/storage/profile-repository.ts`
- `tests/appearance-bootstrap.test.mjs`
- `tests/appearance-contrast.test.mjs`
- `tests/appearance-navigation.test.mjs`
- `tests/appearance-profile.test.mjs`
- `tests/appearance-provider.test.mjs`
- `tests/appearance-runtime.test.mjs`
- `tests/appearance-storage.test.mjs`
- `tests/editor-appearance.test.mjs`
- `types/appearance.ts`
- `types/profile.ts`
