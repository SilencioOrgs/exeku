# Exeku Phase 2A — Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Exeku's authenticated-free, local-profile-based application dashboard featuring a persistent App Router shell, collapsible retro sidebar, Coder Command Station, Challenge library placeholder, local Monaco coding scratchpad with draft persistence, Skill Blueprint progress view, and storage settings.

**Architecture:** A persistent Next.js App Router shell layout (`app/app/layout.tsx`) wraps 5 sub-routes (`/app`, `/app/challenges`, `/app/workspace`, `/app/progress`, `/app/settings`). The existing `useProfile` hook provides hydration-safe client state and route protection. A draft repository layer (`lib/storage/draft-repository.ts`) with safe IndexedDB upgrade (`DB_VERSION = 2`) persists user code buffers locally by profile and language. Monaco editor is loaded client-side with zero external CDN dependencies.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, Base UI / shadcn/ui, Monaco Editor (`@monaco-editor/react`), Doticons pixel icon system, Pixelify Sans, native IndexedDB.

**Spec:** `docs/superpowers/specs/2026-10-13-dashboard-design.md`

## Global Constraints

- **Offline-First:** All assets, fonts, icons, styling, and editor runtimes must remain 100% local. Zero external CDN or network requests.
- **Data Truth Guarantee:** Display only actual locally stored information from IndexedDB (`LocalProfile` and `WorkspaceDraft`). Never fabricate scores, submissions, achievements, levels, or completion percentages.
- **Visual Design System:** Strictly adhere to Exeku's palette: Canvas `#090514`, Surface `#120A24`, Elevated `#1B0F36`, Border `#2E1A57`, Purple `#9E00FF`, Cyan `#00F0FF`, Pink `#FF007A`, Mint `#00FF9D`.
- **Typography Boundaries:** Pixelify Sans (`font-pixel`) strictly for headings and retro badge tags; Geist Sans for body text and form labels; Geist Mono for code and technical tags.
- **Target Hardware:** Responsive for 375px mobile, 768px tablet, 1024px small desktop, 1366×768 Windows lab laptops, and 1440px desktop.
- **Strict Non-Goals:** No cloud auth, no backend APIs, no compiler execution, no automatic grading, no AI assistant, no `.exeku` pack import/export.

## Review Focus

1. **Storage Migration Safety:** Safe IndexedDB upgrade from v1 to v2 must preserve existing profile records in `profiles` store while creating the `drafts` store.
2. **Monaco Client-Side Isolation:** Monaco Editor must load purely client-side without SSR hydration errors or external CDN downloads.
3. **Route Guard & Flicker Prevention:** `/app/*` sub-routes must gracefully handle `isLoading` without redirecting prematurely or causing screen flashes.
4. **Draft Language Isolation:** Switching languages in the workspace must preserve each language's draft independently under the active profile.
5. **Keyboard Accessibility:** Sidebar collapse/expand, navigation links, and workspace toolbars must be fully operable via Tab, Enter, Space, and Escape.

---

### Task 1: Draft Storage & Workspace Domain Models (TDD)

**Files:**
- Create: `types/draft.ts`
- Modify: `lib/storage/db.ts`
- Create: `lib/storage/draft-repository.ts`
- Create: `lib/workspace-defaults.ts`
- Create: `tests/draft-repository.test.mjs`
- Create: `tests/workspace-defaults.test.mjs`

**Interfaces:**
- Produces: `WorkspaceDraft` interface (`id`, `profileId`, `language`, `filename`, `code`, `updatedAt`)
- Produces: `getFilenameForLanguage(lang: PreferredLanguage): string`
- Produces: `getMonacoLanguage(lang: PreferredLanguage): string`
- Produces: `getStarterCode(lang: PreferredLanguage): string`
- Produces: `draftRepository.getDraft(profileId: string, lang: PreferredLanguage): Promise<WorkspaceDraft | null>`
- Produces: `draftRepository.saveDraft(profileId: string, lang: PreferredLanguage, code: string): Promise<WorkspaceDraft>`
- Produces: `draftRepository.resetDraft(profileId: string, lang: PreferredLanguage): Promise<WorkspaceDraft>`
- Produces: `draftRepository.deleteProfileDrafts(profileId: string): Promise<void>`

- [ ] **Step 1: Write failing workspace defaults tests**
  Create `tests/workspace-defaults.test.mjs` testing:
  - Language to filename mappings (`python` -> `main.py`, `java` -> `Main.java`, `cpp` -> `main.cpp`, `c` -> `main.c`).
  - Monaco language identifiers (`python`, `java`, `cpp`, `c`).
  - Non-empty language starter codes containing "Hello, Exeku!".

- [ ] **Step 2: Run test to verify it fails**
  Run: `npx.cmd tsx --test tests/workspace-defaults.test.mjs`
  Expected: FAIL (module not found).

- [ ] **Step 3: Implement `types/draft.ts` and `lib/workspace-defaults.ts`**
  Implement `WorkspaceDraft` interface and mapping functions.

- [ ] **Step 4: Run workspace defaults tests to verify pass**
  Run: `npx.cmd tsx --test tests/workspace-defaults.test.mjs`
  Expected: PASS.

- [ ] **Step 5: Write failing draft repository tests**
  Create `tests/draft-repository.test.mjs` testing:
  - Save and retrieve draft by profileId and language.
  - Reset draft back to default starter code.
  - Delete all drafts for a given profileId without affecting other data.

- [ ] **Step 6: Upgrade `lib/storage/db.ts` to v2 and implement `lib/storage/draft-repository.ts`**
  Upgrade `DB_VERSION` to 2 in `db.ts` with `drafts` store. Implement `draftRepository` CRUD methods.

- [ ] **Step 7: Run all tests to verify pass**
  Run: `npx.cmd tsx --test tests/*.test.mjs`
  Expected: All tests pass (including existing profile tests).

- [ ] **Step 8: Commit Task 1**
  ```bash
  git add types/draft.ts lib/storage/db.ts lib/storage/draft-repository.ts lib/workspace-defaults.ts tests/
  git commit -m "feat(storage): implement draft repository and workspace language mappings"
  ```

---

### Task 2: Persistent App Shell Layout & Navigation Components

**Files:**
- Create: `components/app/app-sidebar.tsx`
- Create: `components/app/app-topbar.tsx`
- Create: `components/app/app-shell.tsx`
- Create: `app/app/layout.tsx`

**Interfaces:**
- Consumes: `useProfile()`, `AVATARS`, `DotIcon`, `PixelBadge`, `PixelButton`
- Produces: Persistent App Shell containing:
  - Collapsible sidebar (240px expanded, 64px icon rail collapsed) with keyboard toggle.
  - Mobile slide-out drawer (<768px) with backdrop.
  - Top app bar (52px) with branding, active route indicator, telemetry pills (`OFFLINE READY`, language, skill level), and link to `/`.
  - Profile auth guard: gracefully redirects unauthenticated visitors to `/setup` without flicker.

- [ ] **Step 1: Implement `components/app/app-sidebar.tsx`**
  Build collapsible sidebar supporting 5 navigation items (`Overview`, `Challenges`, `Workspace`, `Progress`, `Settings`). Support collapsed icon rail with tooltip attributes, active neon indicator, coder profile snippet, and collapse toggle.

- [ ] **Step 2: Implement `components/app/app-topbar.tsx`**
  Build top bar displaying brand link `EXE beam > [CURRENT_ROUTE]`, mobile hamburger button, offline readiness badge, language badge, and landing page link.

- [ ] **Step 3: Implement `components/app/app-shell.tsx` and `app/app/layout.tsx`**
  Coordinate sidebar state (with `localStorage` persistence for collapsed state), mobile drawer toggle, profile loading gate, and render `{children}` inside the scrollable content canvas.

- [ ] **Step 4: Typecheck and lint**
  Run: `npx.cmd tsc --noEmit` and `npm.cmd run lint`
  Expected: 0 errors.

- [ ] **Step 5: Commit Task 2**
  ```bash
  git add components/app/app-sidebar.tsx components/app/app-topbar.tsx components/app/app-shell.tsx app/app/layout.tsx
  git commit -m "feat(dashboard): implement persistent app shell layout, topbar, and collapsible sidebar"
  ```

---

### Task 3: Coder Command Station Overview (`/app`)

**Files:**
- Create: `components/app/command-station.tsx`
- Modify: `app/app/page.tsx`

**Interfaces:**
- Consumes: `useProfile()`, `draftRepository`, `PixelAvatar`, `PixelCard`, `PixelButton`, `PixelBadge`, `DotIcon`
- Produces: The primary `/app` Command Station view:
  - Coder Spotlight card with real avatar, display name, bio, target language, and `EDIT PROFILE ✎` button.
  - Quick action launchpad: `LAUNCH WORKSPACE ▶` (links to `/app/workspace`), `VIEW CHALLENGES ▶` (links to `/app/challenges`).
  - Local Status Matrix: Storage locality (`IndexedDB: exeku_local_v1`), Execution engine (`STANDBY / Phase 2B`), Curriculum repository (`STANDBY / Phase 2C`), and Draft buffer readiness.
  - Upcoming Curriculum Blueprint: Transparent preview of 5 track modules without fabricated scores.

- [ ] **Step 1: Implement `components/app/command-station.tsx`**
  Construct the command center interface honoring zero-fabrication rules and verified machine state.

- [ ] **Step 2: Update `app/app/page.tsx`**
  Replace the temporary `AppWelcome` component with `CommandStation`.

- [ ] **Step 3: Typecheck and lint**
  Run: `npx.cmd tsc --noEmit` and `npm.cmd run lint`
  Expected: 0 errors.

- [ ] **Step 4: Commit Task 3**
  ```bash
  git add components/app/command-station.tsx app/app/page.tsx
  git commit -m "feat(dashboard): implement Coder Command Station overview at /app"
  ```

---

### Task 4: Challenge Library Foundation (`/app/challenges`)

**Files:**
- Create: `components/app/challenges-view.tsx`
- Create: `app/app/challenges/page.tsx`

**Interfaces:**
- Consumes: `useProfile()`, `DotIcon`, `PixelBadge`, `PixelCard`, `PixelButton`
- Produces: `/app/challenges` route:
  - Language track switcher (`Python 3`, `Java`, `C++`, `C`) defaulting to user's preferred language.
  - Difficulty filter interface (`All`, `Beginner`, `Intermediate`, `Advanced`).
  - Meaningful retro empty state with Doticons `box` and `powershell` explaining offline curriculum pack architecture.
  - Educational lab callout explaining standalone `.exeku` problem distribution for offline school labs.
  - Clearly labeled disabled action: `IMPORT PROBLEM PACK (.exeku) [PHASE 2C]`.

- [ ] **Step 1: Implement `components/app/challenges-view.tsx`**
  Build track selector and instructive empty state view.

- [ ] **Step 2: Create `app/app/challenges/page.tsx`**
  Export `ChallengesPage` metadata and view.

- [ ] **Step 3: Typecheck and lint**
  Run: `npx.cmd tsc --noEmit` and `npm.cmd run lint`
  Expected: 0 errors.

- [ ] **Step 4: Commit Task 4**
  ```bash
  git add components/app/challenges-view.tsx app/app/challenges/page.tsx
  git commit -m "feat(dashboard): implement challenge library foundation and track filters at /app/challenges"
  ```

---

### Task 5: Local Monaco Workspace Scratchpad (`/app/workspace`)

**Files:**
- Create: `components/app/monaco-editor-pane.tsx`
- Create: `components/app/workspace-view.tsx`
- Create: `app/app/workspace/page.tsx`

**Interfaces:**
- Consumes: `@monaco-editor/react`, `useProfile()`, `draftRepository`, `workspace-defaults`
- Produces: `/app/workspace` route:
  - Top control bar: Language switcher (`Python 3`, `Java`, `C++`, `C`), dynamic filename tag (`main.py`, `Main.java`, `main.cpp`, `main.c`), `RESET BUFFER ↺`, `DOWNLOAD FILE ↓`, and `RUN CODE ▶` (with `[ENGINE PENDING]` status).
  - Client-side Monaco Editor container with custom dark theme, retro line numbering, and autosaving drafts to IndexedDB.
  - Reset code confirmation dialog preventing accidental loss of edits.
  - Browser file download using standard Blob anchor (`downloadFile(filename, code)`).
  - Bottom terminal split pane: `LOCAL CONSOLE OUTPUT [STANDBY]` with message explaining Phase 2B local execution integration.

- [ ] **Step 1: Implement `components/app/monaco-editor-pane.tsx`**
  Dynamically load Monaco with `@monaco-editor/react`, configure dark editor theme `#090514`, monospace font, and wire change handler.

- [ ] **Step 2: Implement `components/app/workspace-view.tsx`**
  Coordinate active language, load draft from IndexedDB, handle autosave debounce, buffer reset confirmation, and file download.

- [ ] **Step 3: Create `app/app/workspace/page.tsx`**
  Export `WorkspacePage` metadata and view.

- [ ] **Step 4: Typecheck and lint**
  Run: `npx.cmd tsc --noEmit` and `npm.cmd run lint`
  Expected: 0 errors.

- [ ] **Step 5: Commit Task 5**
  ```bash
  git add components/app/monaco-editor-pane.tsx components/app/workspace-view.tsx app/app/workspace/page.tsx
  git commit -m "feat(workspace): implement client-side Monaco scratchpad with draft persistence at /app/workspace"
  ```

---

### Task 6: Skill Blueprint & Local Analytics (`/app/progress`)

**Files:**
- Create: `components/app/progress-view.tsx`
- Create: `app/app/progress/page.tsx`

**Interfaces:**
- Consumes: `useProfile()`, `draftRepository`, `PixelBadge`, `PixelCard`, `DotIcon`
- Produces: `/app/progress` route:
  - Real local analytics: Profile creation date (`createdAt`), last updated date (`updatedAt`), total code runs (`0`), completed challenges (`0 / 0 Loaded`).
  - Saved Drafts Inventory: Real inspection showing which languages have saved drafts in IndexedDB.
  - Curriculum Mastery Roadmap: Transparent visual skill tree without fabricated progress.
  - Offline report export placeholder: `EXPORT PROGRESS REPORT (.json) [PHASE 2C]`.

- [ ] **Step 1: Implement `components/app/progress-view.tsx`**
  Build progress interface drawing only from actual stored local records.

- [ ] **Step 2: Create `app/app/progress/page.tsx`**
  Export `ProgressPage` metadata and view.

- [ ] **Step 3: Typecheck and lint**
  Run: `npx.cmd tsc --noEmit` and `npm.cmd run lint`
  Expected: 0 errors.

- [ ] **Step 4: Commit Task 6**
  ```bash
  git add components/app/progress-view.tsx app/app/progress/page.tsx
  git commit -m "feat(dashboard): implement Skill Blueprint and honest local analytics at /app/progress"
  ```

---

### Task 7: Profile & Storage Settings (`/app/settings`)

**Files:**
- Create: `components/app/settings-view.tsx`
- Create: `app/app/settings/page.tsx`

**Interfaces:**
- Consumes: `useProfile()`, `ProfileEditDialog`, `ProfileResetDialog`, `draftRepository`
- Produces: `/app/settings` route:
  - Profile identity card with active avatar, display name, bio, language, and skill level.
  - "EDIT PROFILE ✎" button launching verified `ProfileEditDialog`.
  - Storage Locality & Health card inspecting IndexedDB database `exeku_local_v1`, record UUID, and clear privacy assurance.
  - Danger Zone card with neon-pink border and "RESET LOCAL PROFILE ✖" button launching verified `ProfileResetDialog` (clears profile and draft records).

- [ ] **Step 1: Implement `components/app/settings-view.tsx`**
  Integrate existing profile editing and reset dialogs, add storage inspection panel.

- [ ] **Step 2: Create `app/app/settings/page.tsx`**
  Export `SettingsPage` metadata and view.

- [ ] **Step 3: Typecheck and lint**
  Run: `npx.cmd tsc --noEmit` and `npm.cmd run lint`
  Expected: 0 errors.

- [ ] **Step 4: Commit Task 7**
  ```bash
  git add components/app/settings-view.tsx app/app/settings/page.tsx
  git commit -m "feat(dashboard): implement profile and storage settings view at /app/settings"
  ```

---

### Task 8: Full Verification Suite, Impeccable Audit & Delivery

**Files:**
- Audit all dashboard, shell, workspace, and test files.

- [ ] **Step 1: Run full unit test suite**
  Run: `npx.cmd tsx --test tests/*.test.mjs`
  Expected: All tests pass.

- [ ] **Step 2: Run ESLint**
  Run: `npm.cmd run lint`
  Expected: 0 errors, 0 warnings.

- [ ] **Step 3: Run TypeScript compiler**
  Run: `npx.cmd tsc --noEmit`
  Expected: 0 type errors.

- [ ] **Step 4: Run production build**
  Run: `npm.cmd run build`
  Expected: Clean compilation of all static routes (`/`, `/setup`, `/app`, `/app/challenges`, `/app/workspace`, `/app/progress`, `/app/settings`).

- [ ] **Step 5: Run Impeccable visual and accessibility audit**
  Run: `& "C:\Users\Asnor\.gemini\config\skills\impeccable\scripts\impeccable.cmd" detect --json ...`
  Expected: 0 defects.

- [ ] **Step 6: Push, PR, and merge delivery protocol**
  - Push `feat/dashboard-shell` to origin.
  - Create pull request against `main` via `gh pr create`.
  - Squash merge pull request via `gh pr merge`.
  - Synchronize local `main`.
