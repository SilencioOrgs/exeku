# Exeku Phase 2A — Dashboard Design Specification

**Status:** Approved  
**Date:** 2026-10-13  
**Target:** Exeku Authenticated-Free Application Dashboard  
**Mode:** Operate (Functional, Developer-Centric, Retro Pixel Craft)  

---

## 1. Executive Summary & Design Intent

Exeku is an offline-first Windows-targeted programming education platform. Phase 2A defines the application shell and dashboard architecture, moving from the temporary Phase 1B welcome screen (`/app`) to a fully articulated, modular desktop workspace.

### Core Philosophy
1. **Zero-Cloud Autonomy**: Operates entirely with the local profile stored in IndexedDB. No login screens, cloud telemetry, or remote dependencies.
2. **Zero-Fabrication Honesty (Data Truth Guarantee)**: Strictly displays only actual locally stored information. Every user badge, avatar, name, and preference originates directly from the active `LocalProfile` record in IndexedDB (`displayName`, `avatarId`, `experienceLevel`, `preferredLanguage`, `bio`, `createdAt`, `updatedAt`, `id`). Absolutely zero fake XP, placeholder rankings, simulated streaks, or fabricated problem stats. Features pending implementation show clean zero counts (`0 code runs`, `0 challenges loaded`) and instructive empty states.
3. **Ergonomic Retro Craft**: Retains the signature dark-violet palette, crisp pixel borders, and Doticons iconography while preserving high readability (Geist Sans for prose, Pixelify Sans strictly for headings and badges).
4. **Desktop & Laptop Ergonomics**: Tailored for standard school lab hardware (Windows 1366×768 laptops up to 1920×1080 desktop displays).

---

## 2. Navigation Architecture & Route Topology

The application shell uses Next.js App Router sub-routes wrapped in a persistent layout (`app/app/layout.tsx`). This ensures persistent sidebar state, zero layout flicker, and native browser history/bookmarking.

```
/ (Landing Page)
│
├── /setup (3-Step Onboarding Wizard)
│
└── /app (Persistent Application Shell & Dashboard Layout)
    ├── /app (Overview / Command Station)
    ├── /app/challenges (Curriculum & Problem Sets)
    ├── /app/workspace (Interactive Code Editor / Scratchpad)
    ├── /app/progress (Skill Tree & Execution Metrics)
    └── /app/settings (Profile, Preferences & Storage Health)
```

### Route-Level Responsibilities

| Route | View Name | Primary User Job |
| :--- | :--- | :--- |
| `/app` | **Command Station** | Instant status scan: active loadout, machine readiness, and one-click workspace launch. |
| `/app/challenges` | **Curriculum Track** | Browse language-specific problem tracks (Python, Java, C++, C). Meaningful empty state teaching offline curriculum pack loading. |
| `/app/workspace` | **Code Sandbox** | Integrated Monaco coding environment, language switcher, scratchpad buffer, and execution preview. |
| `/app/progress` | **Skill Blueprint** | Transparent local milestones and execution history without gamified vanity metrics. |
| `/app/settings` | **System & Profile** | In-place profile editor, language preferences, IndexedDB storage inspection, and destructive reset. |

---

## 3. Layout Structure & Responsive Topology

### Layout Grid

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ TOP APP BAR (52px)                                                                      │
│ [E] EXE beam > DASHBOARD     [● OFFLINE READY] [PYTHON 3] [LVL 01]   [LANDING PAGE ↗] │
├──────────────────────────┬─────────────────────────────────────────────────────────────┤
│ SIDEBAR                  │ MAIN WORKSPACE CANVAS (Scrollable, min-h-[calc(100vh-52px)])│
│ (240px desktop,          │                                                             │
│  64px collapsed,         │  [PAGE HEADER & BREADCRUMBS]                                │
│  drawer on mobile)       │                                                             │
│                          │  [PRIMARY HERO / ACTION BANNER]                             │
│  [CODER SPOTLIGHT]       │                                                             │
│  Avatar, Name, Language  │  [MODULAR WIDGET GRID (1-3 Columns)]                         │
│                          │  - Command Matrix / Status Telemetry                         │
│  [NAVIGATION LINKS]      │  - Track Milestones / Active Scratchpad                     │
│  - 01 Overview           │                                                             │
│  - 02 Challenges         │                                                             │
│  - 03 Workspace          │                                                             │
│  - 04 Progress           │                                                             │
│  - 05 Settings           │                                                             │
│                          │                                                             │
│  [STORAGE TELEMETRY]     │                                                             │
│  IndexedDB Online        │                                                             │
│  [COLLAPSE TOGGLE]       │                                                             │
└──────────────────────────┴─────────────────────────────────────────────────────────────┘
```

### Breakpoint Matrix

| Viewport | Target Device | Sidebar Behavior | Content Layout |
| :--- | :--- | :--- | :--- |
| **Desktop (≥1024px)** | Standard Monitors (1080p, 1440p) | 240px fixed width, collapsible to 64px icon rail. | Multi-column grid (2–3 columns), 24px padding. |
| **Compact Desktop / Laptop (768px – 1023px)** | School Lab Laptops (1366×768) | 64px icon-only rail (expandable on hover/toggle) to maximize editor horizontal canvas. | 2-column or stacked grid, 16px padding. |
| **Mobile (<768px)** | Mobile Preview | Hidden off-canvas drawer triggered by top-bar hamburger; sticky bottom tab bar for quick switching. | Single-column stacked cards, full width. |

---

## 4. Detailed View Specifications

### A. View 1: Overview (`/app` — Command Station)

**Job**: Confirm environment readiness, inspect active loadout, and jump into coding in under 3 seconds.

1. **Coder Spotlight Header**:
   - Left: Real `PixelAvatar` (56px) + `WELCOME, [DISPLAY_NAME]_` (`font-pixel text-2xl`).
   - Bio/Tagline in `text-xs text-[#A79EC4]` if configured.
   - Right: Quick Action Group: `LAUNCH WORKSPACE ▶` (primary cyan button) and `EDIT PROFILE ✎` (secondary button).
2. **Loadout Telemetry Matrix (3 Cards)**:
   - **Card 1: Primary Target**: Language badge (`Python 3`, `Java`, `C++`, or `C`) with corresponding Doticons SVG, compiler target type, and current skill bracket (`[LVL 01: BEGINNER]`).
   - **Card 2: Local Engine Status**: Honest readiness scan:
     - `IndexedDB Storage`: `CONNECTED (exeku_local_v1)` (mint green status indicator).
     - `Execution Sandbox`: `STANDBY (Local Windows runner scheduled for Phase 2B)`.
     - `Offline AI Assistant`: `OFFLINE / UNINITIALIZED (Phase 4)`.
   - **Card 3: Workspace Scratchpad**:
     - Status: `1 BUFFER READY (main.py)`.
     - Last modified timestamp: local timestamp.
3. **Track Blueprint Preview**:
   - Visual roadmap of language track curriculum (e.g. *Python Track: Fundamentals → Control Flow → Data Structures → Systems*).
   - Marked clearly: `CURRICULUM MODULES BUNDLING IN PHASE 2C`.

---

### B. View 2: Challenges (`/app/challenges` — Problem Track)

**Job**: Provide structured programming curricula and problem lists.

1. **Header & Track Filter**:
   - Language selector tabs: `[Python 3]`, `[Java]`, `[C++]`, `[C]`. Defaults to profile preference.
   - Skill Tier Filter: `All`, `Beginner`, `Intermediate`, `Advanced`.
2. **Meaningful Empty State (Honest & Instructive)**:
   - **Visual**: Pixel terminal console graphic with Doticons `box` and `powershell`.
   - **Heading**: `LOCAL CURRICULUM REPOSITORY OFFLINE_` (`font-pixel text-xl`).
   - **Explanation**: "Exeku bundles problem catalogs natively on-device. Phase 2C will introduce standard problem packs for offline school lab environments."
   - **Future Student/Teacher Integration Point**:
     - Educational lab callout: `[OFFLINE LAB CAPABILITY]`
     - "Teachers and instructors will be able to distribute standalone problem packs (`.exeku` bundles) via USB or local network share without requiring an internet connection."
     - Disabled button: `IMPORT PROBLEM PACK (.exeku) [PHASE 2C]`.

---

### C. View 3: Workspace (`/app/workspace` — Code Sandbox)

**Job**: A distraction-free coding canvas preparing for the Monaco Editor integration.

1. **Workspace Control Toolbar**:
   - Active File Tab: `main.py` (or language equivalent) with active file indicator.
   - Language Selector Dropdown: Quickly switch buffer language target.
   - Buffer Actions: `RESET BUFFER ↺`, `DOWNLOAD FILE ↓` (exports local `.py`, `.java`, `.cpp`, `.c` file to Windows filesystem).
   - Execution Trigger: `RUN CODE ▶` (prominent neon-cyan button, currently annotated with `[EXECUTION RUNNER PENDING PHASE 2B]`).
2. **Editor Canvas Area**:
   - Retro editor shell with monospace line numbering (`01` through `18`), dark surface `#090514`, and syntax-highlighted starter boilerplate customized to the profile's chosen language.
3. **Terminal Output Split Pane**:
   - Bottom terminal drawer with header: `LOCAL CONSOLE OUTPUT [STANDBY]`.
   - Status message: `Ready. Press 'Run Code' once the local execution runner is attached.`

---

### D. View 4: Progress (`/app/progress` — Skill Progression)

**Job**: Transparent tracking of local learning milestones without manufactured gamification.

1. **Zero-Fabrication Policy**:
   - Strictly avoid: fake XP meters, arbitrary levels ("Level 42 Wizard"), or meaningless percentage bars.
2. **Real Local Analytics**:
   - `Profile Initialized`: Real formatted date from IndexedDB record (`createdAt`).
   - `Last Active Update`: Real formatted timestamp (`updatedAt`).
   - `Total Code Runs`: `0` (clean, accurate integer).
   - `Completed Challenges`: `0 / 0 Loaded`.
3. **Curriculum Mastery Tree (Visual Roadmap)**:
   - Step 1: `Syntax & Variables` [READY]
   - Step 2: `Conditional Branching` [PENDING PHASE 2C]
   - Step 3: `Iteration & Collections` [PENDING PHASE 2C]
   - Step 4: `Functions & Algorithms` [PENDING PHASE 2C]
   - Step 5: `Low-Level Memory & I/O` [PENDING PHASE 2C]
4. **Offline Export Action**:
   - `EXPORT LOCAL PROGRESS REPORT (.json)`: Future student/teacher handoff mechanism.

---

### E. View 5: Settings (`/app/settings` — System & Data Locality)

**Job**: Full control over local profile identity, programming preferences, and IndexedDB storage.

1. **Profile Identity Card**:
   - Displays avatar, display name, bio, target language, and experience level.
   - Button: `EDIT PROFILE ✎` (opens existing `ProfileEditDialog`).
2. **Storage Inspection & Health**:
   - Database Name: `exeku_local_v1`.
   - Store: `profiles`.
   - Active Profile ID: `UUID (crypto.randomUUID)`.
   - Locality Notice: "This data is stored strictly in your browser's local partition on this machine. No remote telemetry or cloud databases are connected."
3. **Destructive Danger Zone**:
   - Bordered in neon-pink `#FF007A`.
   - Notice: "Deleting your profile permanently erases your identity and local history from this machine."
   - Button: `RESET LOCAL PROFILE ✖` (opens existing `ProfileResetDialog` with mandatory typed `RESET` confirmation).

---

## 5. Component Inventory & Design System Alignment

| Component | Token / Base Element | Purpose in Dashboard |
| :--- | :--- | :--- |
| **Sidebar Navigation** | `nav`, `PixelBadge`, Doticons | Persistent vertical navigation with active neon indicator and keyboard focus. |
| **Status Ribbon** | `PixelBadge`, Doticons (`shield`, `windows`) | Global machine readiness telemetry and offline indicator. |
| **Metric Tiles** | `PixelCard variant="elevated"` | Clean data presentation with crisp drop shadow `[3px_3px_0px_#000000]`. |
| **Empty State Containers** | `PixelCard variant="default"`, Doticons (`box`, `powershell`) | Informative retro containers explaining unreleased modules. |
| **Interactive Buttons** | `PixelButton` (`cyan`, `secondary`, `ghost`, `pink`) | Consistent tactile actions with active offset transforms. |
| **Modal Dialogs** | `dialog`, `backdrop-blur-xs`, `PixelCard` | Portaled in-place editing and destructive reset confirmation. |

---

## 6. Interaction States & Ergonomics

### Sidebar Interaction States
- **Default Item**: `bg-transparent text-[#A79EC4] border-l-2 border-transparent`
- **Hover**: `bg-[#1B0F36] text-white border-l-2 border-[#9E00FF]` (transition 100ms)
- **Active / Current**: `bg-[#1B0F36] text-[#00F0FF] border-l-2 border-[#00F0FF] font-bold shadow-[inset_3px_0_0_#00F0FF]`
- **Focus-Visible**: `outline-none ring-2 ring-[#00F0FF] ring-offset-2 ring-offset-[#120A24]`

### Tactile Feedback
- Button click: `active:translate-x-[2px] active:translate-y-[2px] active:shadow-none`
- No sluggish animations: All micro-interactions bound to 100–150ms transitions.

---

## 7. Accessibility (A11y) & Offline Compliance

- **Contrast Ratios**: Body text `#F5F3FF` and accents `#00F0FF` on background `#090514` exceed WCAG AAA (≥ 7:1).
- **Keyboard Navigation**:
  - Full tab order across sidebar items, toolbar controls, action cards, and modals.
  - Skip-to-content link: hidden visually until focused, jumping directly to `#main-content`.
  - Escape closes all modals and dialogs.
- **Offline Integrity**: 0 external CDN calls, 0 font fetches, 0 analytics beacons.

---

## 8. Student & Teacher Considerations

- **Student Flow**: Frictionless local experience; zero account barrier; no internet needed once deployed.
- **Teacher Flow**:
  - The design anticipates institutional computer labs by reserving architecture hooks for local offline problem pack importation (`.exeku` bundles) and offline signed progress exports.
  - No cloud LMS or remote administration server is required.
