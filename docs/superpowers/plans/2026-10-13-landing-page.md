# Exeku Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the approved retro pixel-art landing page for Exeku in Next.js 16, featuring a custom interactive pixel terminal hero, full offline-first messaging, language matrix, honest roadmap distinction, Windows installation guide, FAQ, and footer.

**Architecture:** Single-page modular architecture inside Next.js 16 App Router. Components live in `components/landing/` and `components/retro/`, consuming Tailwind CSS v4 custom pixel utilities and shadcn Base UI primitives. Page entry point in `app/page.tsx` composes sections with smooth anchor navigation, tactile copy controls, and zero external runtime dependencies.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, shadcn/ui Base UI + Nova preset, Lucide React icons, local Google font loading (`Pixelify_Sans`, `Geist`, `Geist_Mono`).

**Spec:** Landing page design specification approved from Impeccable shaping; [PRODUCT.md](file:///C:/Users/Asnor/webprojects/exeku/PRODUCT.md) and [AGENTS.md](file:///C:/Users/Asnor/webprojects/exeku/AGENTS.md).

## Global Constraints

- Brand wordmark: strictly use `exeku_` (lowercase with terminal underscore).
- Centerpiece terminal execution samples must be clearly labeled as demos/simulations, not real compiler results.
- Never claim the local compiler, auto-grader, offline AI, or standalone Windows installer are completed.
- Windows install guide must explicitly acknowledge the private GitHub repository (`SilencioOrgs/exeku`) and frame setup as a developer preview from source.
- Avoid fake version numbers, fake performance benchmarks, fake telemetry claims, or fake customer logos.
- All fonts and assets must be bundled locally with zero runtime CDN requests.
- Full keyboard accessibility and WCAG AA contrast against dark violet/neon surfaces.

## Review Focus

1. **Terminal Simulation Clarity**: A visitor could confuse the hero code runner with an active backend compiler; verify explicit `[DEMO SIMULATION]` disclaimers and simulated state indicators.
2. **Roadmap Transparency**: A visitor could believe the execution engine or automated grading is already functional; verify clear `[CURRENT FOUNDATION]` vs `[PLANNED ROADMAP]` badges.
3. **Repository Context in Installation**: A visitor cloning without permissions might fail; verify explicit callout that access requires invitation to the private `SilencioOrgs/exeku` repository.
4. **Interactive Reliability**: Copy buttons, tabs, accordions, and navigation links must not fail or cause page jumps; verify clipboard copy states and smooth anchor scrolling.
5. **Mobile & Small Screen Resilience**: Multi-pane pixel terminal and language grid could overflow on 375px viewports; verify stacked responsive layouts without horizontal scrollbars.

---

### Task 1: Design Tokens, Fonts & Global Theme Scaffolding

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`
- Modify: `hooks/use-mobile.ts`

**Interfaces:**
- Produces: CSS variables `--font-pixelify`, `--font-geist-sans`, `--font-geist-mono`, `.pixel-border`, `.pixel-box`, `.pixel-shadow`, `.scanline-overlay`, and `.crt-glow` utility classes in `app/globals.css`.

- [ ] **Step 1: Update `app/layout.tsx` to include `Pixelify_Sans` alongside `Geist` and `Geist_Mono`**
  Configure `Pixelify_Sans({ subsets: ["latin"], variable: "--font-pixelify" })` and wire CSS variables to `<html>`. Set metadata title to `exeku_ — Your Code. Your Machine.` and add descriptive meta tags.

- [ ] **Step 2: Add retro pixel design tokens, utilities, and custom scrollbars to `app/globals.css`**
  Define neon palette color tokens (`--neon-purple`, `--neon-cyan`, `--neon-pink`, `--dark-violet-canvas`, `--dark-violet-card`), pixel border helpers, hard offset box-shadows, scanlines, and retro selection styling (`::selection { background: #9e00ff; color: #ffffff; }`).

- [ ] **Step 3: Fix `hooks/use-mobile.ts` to satisfy ESLint 9 rules without cascading renders**
  Ensure `useIsMobile` initializes cleanly and passes `npm run lint`.

- [ ] **Step 4: Verify font and styling compilation**
  Run: `npm.cmd run lint; npx.cmd tsc --noEmit`
  Expected: PASS with 0 errors.

---

### Task 2: Retro UI Primitives & Navigation Bar

**Files:**
- Create: `components/retro/pixel-badge.tsx`
- Create: `components/retro/pixel-button.tsx`
- Create: `components/retro/pixel-card.tsx`
- Create: `components/landing/navbar.tsx`

**Interfaces:**
- Produces: `PixelBadge`, `PixelButton`, `PixelCard`, and `Navbar` components for use across all landing sections.
- Navbar exports: `export function Navbar(): JSX.Element` with links to `#hero`, `#about`, `#languages`, `#features`, `#install`, `#faq` and a responsive mobile sheet.

- [ ] **Step 1: Implement `PixelBadge`, `PixelButton`, and `PixelCard` in `components/retro/`**
  - `PixelBadge`: variant support (`neon`, `cyan`, `pink`, `mint`, `muted`), bracket wrappers `[ ]`.
  - `PixelButton`: tactile 4px offset shadow, mechanical `active:translate-x-0.5 active:translate-y-0.5` press effect, keyboard focus rings.
  - `PixelCard`: stepped corners, 1px/2px violet border, optional scanline texture.

- [ ] **Step 2: Implement `components/landing/navbar.tsx`**
  - Sticky glass/solid bar with `#090514` ground and bottom pixel border.
  - Left: `exeku_` wordmark with blinking cyan cursor.
  - Center: Desktop anchor links with pixel hover indicators.
  - Right: `[● OFFLINE READY]` indicator with pulsing green dot, and `[INSTALL]` tactile button.
  - Mobile: Clean hamburger toggle triggering responsive slide-out nav.

- [ ] **Step 3: Verify TypeScript and compilation**
  Run: `npx.cmd tsc --noEmit`
  Expected: PASS.

---

### Task 3: Hero Section with Interactive Pixel Terminal Centerpiece

**Files:**
- Create: `components/landing/pixel-terminal.tsx`
- Create: `components/landing/hero.tsx`

**Interfaces:**
- Produces: `Hero` and `PixelTerminal` components.
- `PixelTerminal` maintains client-side tab state between Python 3, C++, and Java snippets, simulated execution progress, and labeled demo output.

- [ ] **Step 1: Implement `components/landing/pixel-terminal.tsx`**
  - Chassis: Arcade-style title bar with `exeku-terminal v0.1.0-preview`, `[NET: DISCONNECTED]`, `[LOCAL: 127.0.0.1]`.
  - Snippet selector: Tabs for Python 3, C++, Java.
  - Code viewport: Monospace syntax-highlighted algorithmic problems with line numbers.
  - Action footer:
    - `[RUN DEMO ▶]` button with sub-second retro blinking execution state (`COMPILING VIA LOCAL GCC...`).
    - Explicit disclaimer banner: `[DEMO SIMULATION • NOT A LIVE COMPILER RESULT]`.
    - Simulated test pass badges: `[✓ Test 1: Passed (0ms)]`, `[✓ Test 2: Passed (0ms)]`.
    - Hardware telemetry readouts: `MEMORY: 18MB | CLOUD PACKETS: 0`.

- [ ] **Step 2: Implement `components/landing/hero.tsx`**
  - Kicker: `[WINDOWS DEV ENVIRONMENT • ZERO CLOUD TELEMETRY]`
  - Headline: `YOUR CODE. YOUR MACHINE.` in `Pixelify_Sans`.
  - Subcopy articulating Exeku's offline-first Windows programming education mission.
  - Action group: `[INSTALL PREVIEW ▶]` (smooth scroll to `#install`) and `[LEARN MORE ▾]` (smooth scroll to `#about`).
  - Embeds `PixelTerminal` as visual centerpiece.

- [ ] **Step 3: Verify component rendering and TypeScript**
  Run: `npx.cmd tsc --noEmit`
  Expected: PASS.

---

### Task 4: About Exeku & Supported Languages Sections

**Files:**
- Create: `components/landing/about.tsx`
- Create: `components/landing/languages.tsx`

**Interfaces:**
- Produces: `About` and `Languages` section components.

- [ ] **Step 1: Implement `components/landing/about.tsx`**
  - Section title: `THE OFFLINE-FIRST MANIFESTO`
  - Narrative: The machine is the lab; why modern coding education should run locally without network dropouts, telemetry, or login walls.
  - 3 cartridge cards:
    1. *Zero Cloud Lock-In*: 100% offline autonomy, no cloud servers dropping connections mid-lesson.
    2. *Classroom Lab Resilient*: Designed for Windows school labs with strict proxies or air-gapped setups.
    3. *Bare-Metal Intimacy*: Teaching how compilers, memory, and algorithms run directly on the machine.

- [ ] **Step 2: Implement `components/landing/languages.tsx`**
  - Section title: `FOUR CORE LANGUAGES`
  - 4 distinct language cards with custom retro accent borders:
    1. **Python 3**: Cyan accent, `[INTERPRETED • LOCAL RUNTIME]`, Fundamentals & Scripting.
    2. **Java**: Gold accent, `[COMPILED • OPENJDK]`, OOP & Data Structures.
    3. **C++**: Neon Purple accent, `[NATIVE • GCC / CLANG]`, Systems Programming & Memory.
    4. **C**: Neon Pink accent, `[BARE METAL • C11/C17]`, Pointers & Architecture.
  - Mini code snippet preview on each card with curriculum track badges.

- [ ] **Step 3: Verify TypeScript**
  Run: `npx.cmd tsc --noEmit`
  Expected: PASS.

---

### Task 5: Features Architecture & Development Roadmap Matrix

**Files:**
- Create: `components/landing/features-roadmap.tsx`

**Interfaces:**
- Produces: `FeaturesRoadmap` section component.

- [ ] **Step 1: Implement `components/landing/features-roadmap.tsx`**
  - Section title: `PLATFORM ARCHITECTURE & ROADMAP`
  - Clear dual-column or tabbed presentation:
    - **Current Foundation (`[CURRENT FOUNDATION]` green badge)**:
      - Next.js 16 + React 19 Local Web Shell (fast, self-hosted, offline).
      - Integrated Monaco Editor (syntax highlighting, multi-cursor editing).
      - Retro Pixel-Craft Design System (accessible, dark violet, high contrast).
      - 100% Offline Asset Delivery (bundled fonts, local icons, zero CDN).
    - **Development Roadmap (`[PLANNED ROADMAP]` pink badge)**:
      - Local Execution Engine (Windows process execution supervisor for compilers).
      - Automated Local Grading (instant unit-test runner on-device).
      - Offline AI Learning Assistant (local quantized language model for hints).
      - Local Student Profiles (file/SQLite progress tracking, zero cloud telemetry).
  - Explicit advisory note reinforcing that execution and grading engines are under active roadmap development.

- [ ] **Step 2: Verify TypeScript**
  Run: `npx.cmd tsc --noEmit`
  Expected: PASS.

---

### Task 6: Windows Installation Guide, FAQ, and Footer

**Files:**
- Create: `components/landing/install-guide.tsx`
- Create: `components/landing/faq.tsx`
- Create: `components/landing/footer.tsx`

**Interfaces:**
- Produces: `InstallGuide`, `FAQ`, and `Footer` components.

- [ ] **Step 1: Implement `components/landing/install-guide.tsx`**
  - Section title: `HOW TO RUN ON WINDOWS`
  - Advisory badge: `[DEVELOPER PREVIEW • PRIVATE REPOSITORY]`
  - Note clarifying that cloning requires access to the private repository `https://github.com/SilencioOrgs/exeku.git`.
  - 3-step pipeline with copy-to-clipboard buttons:
    - Step 1: Check Prerequisites (Windows 10/11 64-bit, Node.js v20+, Git).
    - Step 2: Clone & Navigate (`git clone https://github.com/SilencioOrgs/exeku.git` / `cd exeku`).
    - Step 3: Install & Start (`npm install` / `npm run dev`).
  - Callout for PowerShell execution policy if npm script fails (`Set-ExecutionPolicy -Scope Process RemoteSigned`).
  - Interactive "Copy Command" buttons with tactile feedback.

- [ ] **Step 2: Implement `components/landing/faq.tsx`**
  - Section title: `FREQUENTLY ASKED QUESTIONS`
  - Retro accordion cards answering:
    1. *Does Exeku require internet connectivity?* (Zero internet required after initial install).
    2. *Do students need accounts or cloud logins?* (No accounts, no telemetry, complete local privacy).
    3. *Is Exeku available on macOS or Linux?* (Targeted specifically for Windows environments).
    4. *When will the local execution engine and grading be available?* (In active development on roadmap; developer preview available now).
    5. *Can schools deploy Exeku in air-gapped computer labs?* (Yes, fully self-contained once cloned/packaged).

- [ ] **Step 3: Implement `components/landing/footer.tsx`**
  - Brand mark `exeku_` with tagline "Your Code. Your Machine."
  - Direct anchor links to all sections.
  - Real links to private repository `https://github.com/SilencioOrgs/exeku`.
  - Telemetry Dock: `[PLATFORM: WINDOWS]`, `[CLOUD TELEMETRY: DISABLED]`, `[RUNTIME: LOCALHOST]`.
  - Copyright line for Exeku contributors.

- [ ] **Step 4: Verify TypeScript**
  Run: `npx.cmd tsc --noEmit`
  Expected: PASS.

---

### Task 7: Page Integration, Visual Polish, Verification & Git PR Flow

**Files:**
- Modify: `app/page.tsx`
- Verify: Full test suite (`lint`, `tsc`, `build`, Impeccable check)

**Interfaces:**
- Produces: Production-ready landing page in `app/page.tsx` integrating all components.

- [ ] **Step 1: Integrate all components in `app/page.tsx`**
  Assemble `Navbar`, `Hero`, `About`, `Languages`, `FeaturesRoadmap`, `InstallGuide`, `FAQ`, and `Footer`. Ensure smooth scrolling anchors and semantic container structure.

- [ ] **Step 2: Run verification checks**
  Run:
  - `npm.cmd run lint`
  - `npx.cmd tsc --noEmit`
  - `npm.cmd run build`
  Expected: ALL PASS with 0 errors.

- [ ] **Step 3: Run Impeccable design check**
  Run: `& "C:\Users\Asnor\.gemini\config\skills\impeccable\scripts\impeccable.cmd" detect --json app/page.tsx`
  Inspect findings and apply required polish.

- [ ] **Step 4: Review git status and diff**
  Run: `git status; git diff --stat`
  Verify clean working tree with only expected landing page changes.

- [ ] **Step 5: Commit and push feature branch**
  Commit verified changes to `feat/pixel-landing` and push to `origin`.

- [ ] **Step 6: Create GitHub Pull Request via `gh`**
  Run: `& "C:\Program Files\GitHub CLI\gh.exe" pr create --base main --head feat/pixel-landing --title "feat: implement retro pixel-art landing page" --body "<summary>"`
  Verify PR creation and report URL.

- [ ] **Step 7: Merge and sync local `main`**
  Merge PR if permissions allow, checkout `main`, pull latest changes from `origin`.
