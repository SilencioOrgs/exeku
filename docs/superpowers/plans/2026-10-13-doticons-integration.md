# Doticons Pixel Icon System Integration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate the official Doticons SVG pixel-icon collection into Exeku's completed retro landing page, creating a cohesive dot-matrix visual signature while keeping functional Lucide controls intact.

**Architecture:** Bundle selected Doticons SVG assets into `public/icons/doticons/{16,32}/` with MIT license attribution in `LICENSES/doticons-LICENSE.txt`. Create a type-safe `DotIcon` component in `components/retro/dot-icon.tsx` that supports 16px/32px grid variants, `fill="currentColor"`, sharp pixel rendering, and accessibility semantics. Progressively replace section iconography across Navbar, Hero, About, Languages, Roadmap, Install Guide, FAQ, and Footer.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, SVG path rendering with `currentColor`, Doticons SVG collection.

**Spec:** [USER_REQUEST](file:///C:/Users/Asnor/webprojects/exeku); [PRODUCT.md](file:///C:/Users/Asnor/webprojects/exeku/PRODUCT.md); [AGENTS.md](file:///C:/Users/Asnor/webprojects/exeku/AGENTS.md).

## Global Constraints

- Never rebuild or redesign the landing page structure; focus strictly on icon-system refinement.
- Only bundle genuine Doticons artwork from `https://github.com/eduardconstantin/doticons`.
- Provide full MIT attribution in `LICENSES/doticons-LICENSE.txt`.
- No runtime CDN dependencies or remote icon fetches.
- Keep Lucide React for pure functional UI controls (menu open/close, chevron expand, copy checkmark) where pixel art reduces clarity.
- All icons must adapt to Exeku's neon palette via `currentColor` without blurry scaling or extra glow/gradients.

---

### Task 1: License Attribution & SVG Assets Acquisition

**Files:**
- Create: `LICENSES/doticons-LICENSE.txt`
- Create: `public/icons/doticons/16/` (selected SVGs)
- Create: `public/icons/doticons/32/` (selected SVGs)

- [ ] **Step 1: Create `LICENSES/doticons-LICENSE.txt` with upstream MIT license**
- [ ] **Step 2: Fetch and save selected genuine Doticons SVGs (16px and 32px variants)**
  Download the exact set: `windows`, `python`, `java`, `cplusplus`, `next`, `vscode`, `ai`, `database`, `github`, `npm`, `powershell`, `shield`, `cloud`, `lock-close`, `circleCheck`, `circlePlay`, `stars`, `cog`, `box`, `file`, `arrowRight`, `arrowUp`, `chat`, `list`.

---

### Task 2: Reusable `DotIcon` React Component Abstraction

**Files:**
- Create: `components/retro/dot-icon.tsx`

- [ ] **Step 1: Implement `DotIcon` component with typed icon names and SVG paths**
  Embed the genuine Doticons path definitions for 16px (and 32px) grids, providing `size`, `grid` (16 | 32), `fill="currentColor"`, `aria-hidden` or accessible `aria-label`, and `image-rendering: pixelated`.
- [ ] **Step 2: Verify compilation with `npx tsc --noEmit`**

---

### Task 3: Visual Integration — Navbar & Hero

**Files:**
- Modify: `components/landing/navbar.tsx`
- Modify: `components/landing/hero.tsx`
- Modify: `components/landing/pixel-terminal.tsx`

- [ ] **Step 1: Replace Navbar brand icon with Doticons `powershell`**
- [ ] **Step 2: Replace Hero trust badges and CTAs with Doticons `shield`, `cog`, and `windows`**
- [ ] **Step 3: Replace Terminal centerpiece language icons and Run button with Doticons `python`, `cplusplus`, `java`, `circlePlay`, `windows`**
- [ ] **Step 4: Verify with `npx tsc --noEmit`**

---

### Task 4: Visual Integration — About & Languages

**Files:**
- Modify: `components/landing/about.tsx`
- Modify: `components/landing/languages.tsx`

- [ ] **Step 1: Update About section with Doticons `cloud`, `windows`/`box`, `cog`, and `stars`**
- [ ] **Step 2: Update Languages section with genuine Doticons `python`, `java`, `cplusplus`, and `file`**
- [ ] **Step 3: Verify with `npx tsc --noEmit`**

---

### Task 5: Visual Integration — Features & Roadmap

**Files:**
- Modify: `components/landing/features-roadmap.tsx`

- [ ] **Step 1: Update Foundation cards with Doticons `next`, `vscode`, `stars`, `shield`**
- [ ] **Step 2: Update Roadmap cards with Doticons `cog`, `circleCheck`, `ai`, `database`**
- [ ] **Step 3: Verify with `npx tsc --noEmit`**

---

### Task 6: Visual Integration — Installation Guide, FAQ & Footer

**Files:**
- Modify: `components/landing/install-guide.tsx`
- Modify: `components/landing/faq.tsx`
- Modify: `components/landing/footer.tsx`

- [ ] **Step 1: Update Install Guide with Doticons `github`, `npm`, `powershell`, and `lock-close`**
- [ ] **Step 2: Update FAQ with Doticons `chat`/`list` question indicators while keeping Lucide Chevron controls**
- [ ] **Step 3: Update Footer with Doticons `powershell`, `github`, and `arrowUp`**
- [ ] **Step 4: Verify with `npx tsc --noEmit`**

---

### Task 7: Visual Quality Review, Verification & Git Delivery

- [ ] **Step 1: Run full verification suite (`npm run lint`, `npx tsc --noEmit`, `npm run build`)**
- [ ] **Step 2: Run Impeccable design detector (`impeccable detect`)**
- [ ] **Step 3: Review git diff and commit to `feat/doticons-integration`**
- [ ] **Step 4: Push branch to `origin`**
- [ ] **Step 5: Create PR using `gh pr create`**
- [ ] **Step 6: Squash & merge PR into `main`**
- [ ] **Step 7: Synchronize local `main` and verify clean git status**
