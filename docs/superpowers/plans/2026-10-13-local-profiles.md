# Local Profile System & Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an offline-first, client-side local profile onboarding, persistence (IndexedDB), editing, and welcome app shell (`/setup` and `/app`) for Exeku using retro pixel-art aesthetic and Doticons.

**Architecture:** A repository-backed IndexedDB storage layer (`lib/storage/profile-repository.ts`) stores the single active `LocalProfile`. A React hook (`hooks/use-profile.ts`) manages hydration-safe client state. The `/setup` route presents a 3-step retro wizard (Identity -> Avatar -> Loadout), while `/app` serves as a minimal welcome shell with in-place editing and explicit reset confirmation. Landing page "Get Started" entry points dynamically route to `/app` (returning) or `/setup` (new).

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, Base UI / shadcn/ui, Doticons SVG system, Pixelify Sans, native IndexedDB.

**Spec:** Provided in conversation prompt (Phase 1B Local Profile System Specification).

## Global Constraints

- **Offline-First:** All assets, avatars, fonts, and data must remain 100% local. Zero cloud services, external databases, or remote telemetry.
- **No External Images:** Avatars are rendered using locally bundled inline SVGs with crisp integer pixel geometry. No external image URLs.
- **Visual Design:** Strictly follow Exeku design tokens: canvas `#090514`, surface `#120A24`, elevated `#1B0F36`, border `#2E1A57`, neon purple `#9E00FF`, neon cyan `#00F0FF`, neon pink `#FF007A`, mint `#00FF9D`.
- **Display Name Validation:** Trimmed string, length 2–32 characters, non-empty, alphanumeric and common punctuation.
- **Non-Negotiable Scope:** No full dashboard, challenge library, compiler execution, or cloud auth.

## Review Focus

1. **Hydration safety:** Browser-only IndexedDB access must never execute during Next.js SSR or cause hydration mismatches.
2. **Missing/Corrupted records:** Graceful recovery if IndexedDB is cleared, corrupted, or unavailable in private browsing mode.
3. **Duplicate profile prevention:** Existing profiles on `/setup` must be detected to offer continue or edit rather than overwriting without consent.
4. **Destructive confirmation:** Profile reset/deletion requires explicit two-step confirmation with clear consequence messaging.
5. **Keyboard accessibility:** Avatar grid and loadout selection cards must be fully navigable via Tab and selectable via Enter/Space.

---

### Task 1: Core Types, Validation & Pixel Avatar Collection

**Files:**
- Create: `types/profile.ts`
- Create: `lib/profile-validation.ts`
- Create: `lib/avatars.ts`
- Create: `tests/profile-validation.test.mjs`

**Interfaces:**
- Produces: `LocalProfile`, `ExperienceLevel`, `PreferredLanguage`, `AvatarDefinition`
- Produces: `validateDisplayName(name: string): { isValid: boolean; error?: string }`
- Produces: `AVATARS: AvatarDefinition[]` (at least 6 original pixel designs, default `glitch-bot`)

- [ ] **Step 1: Write the failing validation tests**
  Create `tests/profile-validation.test.mjs` testing:
  - Valid name ("PixelCoder") returns `{ isValid: true }`
  - Whitespace-only name ("   ") returns `{ isValid: false, error: "Display name cannot be empty" }`
  - Short name ("A") returns `{ isValid: false, error: "Display name must be at least 2 characters" }`
  - Overlong name (33+ characters) returns `{ isValid: false, error: "Display name must be at most 32 characters" }`
  - Name with invalid symbols ("Coder<script>") returns `{ isValid: false }`

- [ ] **Step 2: Run test to verify it fails**
  Run: `node --test tests/profile-validation.test.mjs`
  Expected: FAIL (module not found)

- [ ] **Step 3: Implement `types/profile.ts`**
  Define `LocalProfile` (`id`, `displayName`, `bio?`, `avatarId`, `experienceLevel`, `preferredLanguage`, `createdAt`, `updatedAt`).

- [ ] **Step 4: Implement `lib/profile-validation.ts`**
  Implement `validateDisplayName` with regex check and length bounds (2–32 chars).

- [ ] **Step 5: Implement `lib/avatars.ts`**
  Implement 8 distinct original pixel-art SVG avatar definitions:
  - `glitch-bot` (Cybernetic robot visor - default)
  - `pixel-cat` (Cyber feline with neon pink ears)
  - `crt-terminal` (Phosphor terminal monitor)
  - `matrix-mage` (Pixel hacker hood)
  - `byte-skull` (Cyber skull with pixel shades)
  - `synth-scout` (Space pilot helmet)
  - `chip-core` (Microprocessor circuit block)
  - `retro-ninja` (8-bit cyber shinobi)
  Each avatar defined with `id`, `name`, `accentColor`, and crisp pixel SVG path/rects.

- [ ] **Step 6: Run tests and verify they pass**
  Run: `node --test tests/profile-validation.test.mjs`
  Expected: PASS

- [ ] **Step 7: Commit Task 1**
  ```bash
  git add types/profile.ts lib/profile-validation.ts lib/avatars.ts tests/profile-validation.test.mjs
  git commit -m "feat(profile): add profile types, validation logic, and pixel avatars"
  ```

---

### Task 2: IndexedDB Persistence & Repository Layer

**Files:**
- Create: `lib/storage/db.ts`
- Create: `lib/storage/profile-repository.ts`
- Create: `tests/profile-repository.test.mjs`

**Interfaces:**
- Produces: `profileRepository.getActiveProfile(): Promise<LocalProfile | null>`
- Produces: `profileRepository.saveProfile(profile: Omit<LocalProfile, 'id' | 'createdAt' | 'updatedAt'>): Promise<LocalProfile>`
- Produces: `profileRepository.updateProfile(id: string, updates: Partial<LocalProfile>): Promise<LocalProfile>`
- Produces: `profileRepository.deleteProfile(id: string): Promise<void>`
- Produces: `profileRepository.hasProfile(): Promise<boolean>`

- [ ] **Step 1: Write repository integration test**
  Create `tests/profile-repository.test.mjs` asserting save, retrieve, update, and delete behavior against the repository abstraction.

- [ ] **Step 2: Run test to verify it fails**
  Run: `node --test tests/profile-repository.test.mjs`
  Expected: FAIL

- [ ] **Step 3: Implement `lib/storage/db.ts`**
  Provide safe Promise-based IndexedDB opener for database `exeku_local_v1` and objectStore `profiles`. Include in-memory fallback for non-browser/test environments.

- [ ] **Step 4: Implement `lib/storage/profile-repository.ts`**
  Implement CRUD operations, `crypto.randomUUID()` generation, ISO date stamping, corruption recovery, and typed error handling.

- [ ] **Step 5: Run tests to verify they pass**
  Run: `node --test tests/profile-repository.test.mjs`
  Expected: PASS

- [ ] **Step 6: Commit Task 2**
  ```bash
  git add lib/storage/db.ts lib/storage/profile-repository.ts tests/profile-repository.test.mjs
  git commit -m "feat(storage): implement IndexedDB profile repository layer"
  ```

---

### Task 3: Hydration-Safe React State Hook (`hooks/use-profile.ts`)

**Files:**
- Create: `hooks/use-profile.ts`

**Interfaces:**
- Consumes: `profileRepository` from `lib/storage/profile-repository.ts`
- Produces: `useProfile(): { profile: LocalProfile | null; isLoading: boolean; error: string | null; saveProfile: (...); updateProfile: (...); resetProfile: (...); reload: (...) }`

- [ ] **Step 1: Implement `hooks/use-profile.ts`**
  Ensure SSR hydration safety: `isLoading` begins `true`, initial effect queries `profileRepository.getActiveProfile()`, gracefully handles errors, and broadcasts local storage events for multi-tab sync.

- [ ] **Step 2: Commit Task 3**
  ```bash
  git add hooks/use-profile.ts
  git commit -m "feat(hooks): add hydration-safe useProfile hook"
  ```

---

### Task 4: Onboarding 3-Step Wizard (`/setup`)

**Files:**
- Create: `components/setup/step-identity.tsx`
- Create: `components/setup/step-avatar.tsx`
- Create: `components/setup/step-loadout.tsx`
- Create: `components/setup/onboarding-wizard.tsx`
- Create: `app/setup/page.tsx`

**Interfaces:**
- Consumes: `useProfile`, `AVATARS`, `validateDisplayName`, `DotIcon`, `PixelCard`, `PixelButton`, `PixelBadge`
- Produces: Interactive `/setup` route with 3 steps:
  1. Identity (`WELCOME, CODER_`): Display name + optional bio
  2. Avatar (`SELECT YOUR AVATAR_`): 8-tile pixel grid with keyboard support
  3. Loadout (`CONFIGURE YOUR LOADOUT_`): Experience level (Beginner/Intermediate/Advanced) + Language (Python 3/Java/C++/C) + Summary Card

- [ ] **Step 1: Implement Step 1 (Identity)**
  Display name input with retro styling, real-time character count `X/32`, accessible validation errors, optional bio.

- [ ] **Step 2: Implement Step 2 (Avatar)**
  8-avatar selection grid, keyboard navigable, neon active ring/border, default avatar pre-selected.

- [ ] **Step 3: Implement Step 3 (Loadout)**
  Experience level selector, preferred language selection cards with Doticons (`python`, `java`, `cplusplus`, `file`), review summary banner.

- [ ] **Step 4: Implement `onboarding-wizard.tsx` & `app/setup/page.tsx`**
  Progress breadcrumbs (`[01/03 IDENTITY] ▶ [02/03 AVATAR] ▶ [03/03 LOADOUT]`), back/next controls, final `CREATE PROFILE ▶` action persisting to IndexedDB and routing to `/app`. Existing profile detection banner.

- [ ] **Step 5: Verify via `npm.cmd run lint` & `npx.cmd tsc --noEmit`**

- [ ] **Step 6: Commit Task 4**
  ```bash
  git add components/setup/ app/setup/page.tsx
  git commit -m "feat(onboarding): implement 3-step retro profile wizard at /setup"
  ```

---

### Task 5: Minimal App Destination & Profile Editing/Resetting (`/app`)

**Files:**
- Create: `components/app/profile-edit-dialog.tsx`
- Create: `components/app/profile-reset-dialog.tsx`
- Create: `components/app/app-welcome.tsx`
- Create: `app/app/page.tsx`

**Interfaces:**
- Consumes: `useProfile`, `AVATARS`, `DotIcon`, `PixelCard`, `PixelButton`
- Produces: Interactive `/app` route:
  - Profile welcome card with active avatar, name, language, experience level
  - Roadmap status card ("COMING SOON: Local execution engine & grading")
  - "EDIT PROFILE" button opening `ProfileEditDialog`
  - "RESET PROFILE" button opening `ProfileResetDialog` with destructive confirmation

- [ ] **Step 1: Implement `ProfileEditDialog`**
  Modal dialog allowing updating display name, avatar, experience level, and language. Saves immediately to IndexedDB.

- [ ] **Step 2: Implement `ProfileResetDialog`**
  Destructive 2-step confirmation dialog with explicit notice: "Deleting your local profile cannot be undone." Clears record and routes back to `/setup`.

- [ ] **Step 3: Implement `app-welcome.tsx` & `app/app/page.tsx`**
  Renders dashboard welcome screen. If no profile exists, safely redirects to `/setup`.

- [ ] **Step 4: Verify via `npm.cmd run lint` & `npx.cmd tsc --noEmit`**

- [ ] **Step 5: Commit Task 5**
  ```bash
  git add components/app/ app/app/page.tsx
  git commit -m "feat(app): implement minimal welcome destination, profile editor, and reset dialog"
  ```

---

### Task 6: Landing Page Dynamic Entry Points

**Files:**
- Modify: `components/landing/navbar.tsx`
- Modify: `components/landing/hero.tsx`

**Interfaces:**
- Consumes: `useProfile`
- Changes: "Get Started" / "Run Exeku" buttons dynamically route to `/app` (if profile exists) or `/setup` (if no profile).

- [ ] **Step 1: Update Navbar "GET STARTED" button**
  Add client-side routing logic targeting `/app` or `/setup`.

- [ ] **Step 2: Update Hero "RUN EXE beam" / "GET STARTED" buttons**
  Add client-side routing logic targeting `/app` or `/setup`.

- [ ] **Step 3: Verify landing page retains complete functionality and zero layout shifts**

- [ ] **Step 4: Commit Task 6**
  ```bash
  git add components/landing/navbar.tsx components/landing/hero.tsx
  git commit -m "feat(landing): connect Get Started buttons to dynamic profile routing"
  ```

---

### Task 7: Full Verification Suite, Impeccable Audit & PR Delivery

**Files:**
- Audit all modified & created files

- [ ] **Step 1: Run unit tests**
  Run: `node --test tests/*.test.mjs`
  Expected: All tests pass.

- [ ] **Step 2: Run ESLint**
  Run: `npm.cmd run lint`
  Expected: 0 errors.

- [ ] **Step 3: Run TypeScript compiler**
  Run: `npx.cmd tsc --noEmit`
  Expected: 0 type errors.

- [ ] **Step 4: Run production build**
  Run: `npm.cmd run build`
  Expected: Successful compilation of `/`, `/setup`, `/app`, `/_not-found`.

- [ ] **Step 5: Run Impeccable detect audit**
  Run: `& "C:\Users\Asnor\.gemini\config\skills\impeccable\scripts\impeccable.cmd" detect --json ...`
  Expected: 0 issues.

- [ ] **Step 6: Push branch, create PR, squash merge, and sync main**
  - `git push -u origin feat/local-profiles`
  - `gh pr create --base main --head feat/local-profiles`
  - `gh pr merge <id> --squash`
  - `git checkout main && git pull origin main`
