# Exeku Phase 2B — Online-First Pivot, Code Execution & Automatic Judging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pivot Exeku from offline-first Windows software to an online-first programming education and competition platform (in local developer preview). Implement typed execution contracts, Piston sandbox adapter, bounded execution queue, a 3-problem catalog, deterministic automatic judging engine with verdict calculation, enhanced Monaco workspace with Run/Submit controls, interactive challenges browser, and updated product documentation.

**Architecture:** 
- `types/execution.ts` & `types/problem.ts`: Strict schemas for code execution, submissions, and problems.
- `lib/execution/piston-adapter.ts`: Portable client for self-hosted Piston sandboxes (`POST /api/v2/execute`) handling Python 3, Java (Main.java), C++, and C with resource limits.
- `lib/execution/queue.ts`: Bounded concurrency queue (concurrency: 4, capacity: 50) designed for ~30 contestant competitions.
- `lib/problems/catalog.ts`: Server-authoritative problem repository (3 initial problems: Hello World, Sum of Two Integers, Even or Odd) with hidden test protection.
- `lib/judge/judging-service.ts`: Deterministic evaluation with normalized output comparison and hidden-test redaction.
- `app/api/execute`, `app/api/judge`, `app/api/problems`, `app/api/health`: Next.js App Router API routes.
- `components/app/workspace-view.tsx` & `components/app/challenges-view.tsx`: Real Run/Submit UI, test case breakdown, problem drawer, and graceful sandbox-unavailable states.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, Monaco Editor, Doticons, Piston REST API contract, Node test runner.

---

### Task 1: Product & Architecture Documentation Pivot

**Files:**
- Modify: `PRODUCT.md`
- Modify: `AGENTS.md`
- Create: `docs/superpowers/specs/2026-10-14-appearance-studio-spec.md`
- Create: `types/lesson-integration.ts`

- [ ] **Step 1: Update `PRODUCT.md`**
  Reflect online-first platform positioning inspired by CodeChum, developer preview status, future online deployment, supported languages (Python 3, Java, C++, C), online competitions roadmap, and data truth boundaries.

- [ ] **Step 2: Update `AGENTS.md`**
  Update architectural rules, execution engine boundaries, and team ownership matrix (primary developer owns workspace/judge/problems/competitions; teammate owns lessons/curriculum).

- [ ] **Step 3: Create `docs/superpowers/specs/2026-10-14-appearance-studio-spec.md`**
  Document Phase 2C Appearance Studio requirements (3 themes: Pixel Arcade, Minimal SaaS, Studio/CRM; font sizing; high contrast; live preview).

- [ ] **Step 4: Create `types/lesson-integration.ts`**
  Define clear decoupled boundary between future teammate lessons and the problem/judge engine.

- [ ] **Step 5: Commit Task 1**
  ```bash
  git add PRODUCT.md AGENTS.md docs/superpowers/specs/2026-10-14-appearance-studio-spec.md types/lesson-integration.ts
  git commit -m "docs(pivot): update product positioning to online-first platform and define team boundaries"
  ```

---

### Task 2: Code Execution Contracts & Sandbox Adapter Architecture (TDD)

**Files:**
- Create: `types/execution.ts`
- Create: `lib/execution/validation.ts`
- Create: `lib/execution/piston-adapter.ts`
- Create: `lib/execution/mock-adapter.ts`
- Create: `lib/execution/queue.ts`
- Create: `tests/execution-contracts.test.mjs`
- Create: `tests/execution-queue.test.mjs`

- [ ] **Step 1: Write failing execution contract tests**
  Create `tests/execution-contracts.test.mjs` testing:
  - Validation of code length (max 64KB), stdin length (max 64KB), and supported languages (`python`, `java`, `cpp`, `c`).
  - Request building for Piston adapter (file name mapping, compile timeout, run timeout).
  - Piston response normalization into standard `ExecutionResult`.

- [ ] **Step 2: Run test to verify it fails**
  Run: `npx.cmd tsx --test tests/execution-contracts.test.mjs`
  Expected: FAIL.

- [ ] **Step 3: Implement `types/execution.ts`, `lib/execution/validation.ts`, and `lib/execution/piston-adapter.ts`**
  Implement core types, request validators, and Piston adapter.

- [ ] **Step 4: Implement `lib/execution/mock-adapter.ts`**
  Deterministic mock sandbox adapter for contract verification and automated tests.

- [ ] **Step 5: Write failing queue tests**
  Create `tests/execution-queue.test.mjs` testing:
  - Concurrency throttling (max 4 concurrent executions).
  - Queue backlog capacity rejection (HTTP 429 when queue exceeds capacity).
  - Timeout enforcement on queued tasks.

- [ ] **Step 6: Implement `lib/execution/queue.ts`**
  Bounded concurrency execution queue.

- [ ] **Step 7: Run all execution tests to verify pass**
  Run: `npx.cmd tsx --test tests/execution-*.test.mjs`
  Expected: PASS.

- [ ] **Step 8: Commit Task 2**
  ```bash
  git add types/execution.ts lib/execution/ tests/execution-*.test.mjs
  git commit -m "feat(execution): implement execution contracts, piston adapter, and bounded queue"
  ```

---

### Task 3: Programming Problem Engine & Initial Catalog (TDD)

**Files:**
- Create: `types/problem.ts`
- Create: `lib/problems/validation.ts`
- Create: `lib/problems/catalog.ts`
- Create: `tests/problem-catalog.test.mjs`

- [ ] **Step 1: Write failing problem catalog tests**
  Create `tests/problem-catalog.test.mjs` testing:
  - Loading catalog problems (`hello-world`, `sum-two-integers`, `even-or-odd`).
  - Filtering problems by difficulty and language.
  - Verifying `getVisibleProblem(id)` strips hidden test cases while preserving visible and sample tests.
  - Validating input/output schema integrity.

- [ ] **Step 2: Run test to verify it fails**
  Run: `npx.cmd tsx --test tests/problem-catalog.test.mjs`
  Expected: FAIL.

- [ ] **Step 3: Implement `types/problem.ts` and `lib/problems/validation.ts`**
  TypeScript definitions and validation checks.

- [ ] **Step 4: Implement `lib/problems/catalog.ts`**
  Define initial 3 problems with complete statements, constraints, sample tests, visible tests, and authoritative hidden tests.

- [ ] **Step 5: Run tests to verify pass**
  Run: `npx.cmd tsx --test tests/problem-catalog.test.mjs`
  Expected: PASS.

- [ ] **Step 6: Commit Task 3**
  ```bash
  git add types/problem.ts lib/problems/ tests/problem-catalog.test.mjs
  git commit -m "feat(problems): implement programming problem schema and initial 3-problem catalog"
  ```

---

### Task 4: Automatic Judging Engine & Verdict Computation (TDD)

**Files:**
- Create: `lib/judge/output-normalizer.ts`
- Create: `lib/judge/judging-service.ts`
- Create: `tests/judging-service.test.mjs`

- [ ] **Step 1: Write failing judging service tests**
  Create `tests/judging-service.test.mjs` testing:
  - Output normalization (line ending carriage return stripping, trailing whitespace trimming).
  - Accepted verdict when all tests match.
  - Wrong Answer verdict with diff on visible tests, and redacted diff on hidden tests.
  - Compilation Error handling.
  - Runtime Error handling.
  - Time Limit Exceeded handling.
  - Partial score calculation (e.g., 2/3 tests passed = 66%).

- [ ] **Step 2: Run test to verify it fails**
  Run: `npx.cmd tsx --test tests/judging-service.test.mjs`
  Expected: FAIL.

- [ ] **Step 3: Implement `lib/judge/output-normalizer.ts` and `lib/judge/judging-service.ts`**
  Implement strict output comparison policy, test runner, verdict calculator, and hidden-test protection.

- [ ] **Step 4: Run tests to verify pass**
  Run: `npx.cmd tsx --test tests/judging-service.test.mjs`
  Expected: PASS.

- [ ] **Step 5: Commit Task 4**
  ```bash
  git add lib/judge/ tests/judging-service.test.mjs
  git commit -m "feat(judge): implement automatic judging engine with verdict calculation and test redaction"
  ```

---

### Task 5: Server API Routes (`/api/execute`, `/api/judge`, `/api/problems`, `/api/health`)

**Files:**
- Create: `app/api/execute/route.ts`
- Create: `app/api/judge/route.ts`
- Create: `app/api/problems/route.ts`
- Create: `app/api/problems/[id]/route.ts`
- Create: `app/api/health/route.ts`
- Create: `tests/api-routes.test.mjs`

- [ ] **Step 1: Implement API routes**
  - `POST /api/execute`: Validates body, feeds into `ExecutionQueue`, runs via adapter, returns `ExecutionResult`.
  - `POST /api/judge`: Validates problemId & code, feeds into `JudgingService`, returns `SubmissionVerdictResult`.
  - `GET /api/problems`: Returns problem summaries with hidden tests excluded.
  - `GET /api/problems/[id]`: Returns single problem with visible test cases only.
  - `GET /api/health`: Probes Piston sandbox health and returns connectivity status.

- [ ] **Step 2: Write API route tests**
  Create `tests/api-routes.test.mjs` validating handlers with mock payloads.

- [ ] **Step 3: Run tests and typecheck**
  Run: `npx.cmd tsx --test tests/*.test.mjs` and `npx.cmd tsc --noEmit`.
  Expected: PASS.

- [ ] **Step 4: Commit Task 5**
  ```bash
  git add app/api/ tests/api-routes.test.mjs
  git commit -m "feat(api): implement execute, judge, problems, and health API endpoints"
  ```

---

### Task 6: Monaco Workspace Enhancement (`/app/workspace`)

**Files:**
- Modify: `components/app/workspace-view.tsx`
- Modify: `lib/workspace-defaults.ts`

- [ ] **Step 1: Update starter templates to match problem I/O**
  Ensure default templates in `lib/workspace-defaults.ts` demonstrate standard input reading for competitive programming.

- [ ] **Step 2: Enhance `components/app/workspace-view.tsx`**
  - Add URL query parameter support for `?problem=[id]` to bind workspace to a specific problem.
  - Add "RUN CODE ▶" button that posts to `/api/execute` with optional custom standard input.
  - Add "SUBMIT SOLUTION ✔" button that posts to `/api/judge` against test cases when a problem is selected.
  - Add multi-tab console output dock: `Execution Output`, `Custom Stdin`, and `Test Results` (with badge verdicts: `ACCEPTED`, `WRONG ANSWER`, etc.).
  - Add sandbox health indicator: if `/api/health` indicates sandbox is offline, show clear instructive badge and banner (`SANDBOX UNAVAILABLE: Connect local Piston on port 2000`).

- [ ] **Step 3: Typecheck and lint**
  Run: `npx.cmd tsc --noEmit` and `npm.cmd run lint`.
  Expected: 0 errors.

- [ ] **Step 4: Commit Task 6**
  ```bash
  git add components/app/workspace-view.tsx lib/workspace-defaults.ts
  git commit -m "feat(workspace): add Run Code and Submit Solution panels to Monaco workspace"
  ```

---

### Task 7: Interactive Problem Solving UI (`/app/challenges`)

**Files:**
- Modify: `components/app/challenges-view.tsx`

- [ ] **Step 1: Enhance `components/app/challenges-view.tsx`**
  - Fetch problems from catalog / `/api/problems`.
  - Add interactive problem list table with Difficulty badges (`Beginner`, `Intermediate`, `Advanced`), Category, Supported Languages, and "Solve" buttons.
  - Add problem details drawer showing full description, input format, output format, constraints, and sample test cases.
  - Add direct jump button: `SOLVE IN WORKSPACE →` navigating to `/app/workspace?problem=[id]`.

- [ ] **Step 2: Typecheck and lint**
  Run: `npx.cmd tsc --noEmit` and `npm.cmd run lint`.
  Expected: 0 errors.

- [ ] **Step 3: Commit Task 7**
  ```bash
  git add components/app/challenges-view.tsx
  git commit -m "feat(challenges): implement interactive problem catalog and problem details drawer"
  ```

---

### Task 8: Landing Page Accuracy & Telemetry Alignment

**Files:**
- Modify: `components/landing/hero-section.tsx` (or landing components)
- Modify: `components/app/app-topbar.tsx`
- Modify: `components/app/command-station.tsx`

- [ ] **Step 1: Update landing page copy**
  Replace "Offline-first Windows software" claims with accurate "Developer Preview: Online programming practice and competition platform". Replace "Offline Ready" pills with "Developer Preview".

- [ ] **Step 2: Update topbar and command station telemetry**
  Display `PREVIEW MODE` and sandbox status instead of offline assertions.

- [ ] **Step 3: Typecheck and lint**
  Run: `npx.cmd tsc --noEmit` and `npm.cmd run lint`.
  Expected: 0 errors.

- [ ] **Step 4: Commit Task 8**
  ```bash
  git add components/landing/ components/app/app-topbar.tsx components/app/command-station.tsx
  git commit -m "chore(telemetry): update landing page and app telemetry to reflect online platform preview"
  ```

---

### Task 9: Full Verification Suite, Build & GitHub Delivery

**Files:**
- Audit all files, tests, and documentation.

- [ ] **Step 1: Run all unit tests**
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
  Expected: Static and API routes compile cleanly.

- [ ] **Step 5: Push, PR, and merge delivery protocol**
  - Push `feat/online-judge-mvp` to origin.
  - Create pull request via `gh pr create`.
  - Squash merge pull request via `gh pr merge`.
  - Synchronize local `main`.
