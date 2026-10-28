# Practice Problem List Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the legacy Challenges cards with a responsive, minimalist practice list with real catalog filters, local submission status, pagination, and a safe problem preview.

**Architecture:** Keep the existing `GET /api/problems` summary contract and `GET /api/problems/[id]` redacted preview contract. Add a small IndexedDB submission metadata store so status filters use actual returned judge verdicts, never draft guesses or invented submissions. Keep the list, filters, and preview UI separated into focused components.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind v4, existing Base UI shadcn primitives, lucide-react, IndexedDB repository, Node test runner via tsx.

**Spec:** User's HackerRank-style redesign brief, Phase 3: problem list with filter rail.

## Global Constraints

- Preserve Next.js, React, TypeScript, Tailwind v4, Base UI, and current dependencies.
- Do not change `POST /api/execute`, `POST /api/judge`, `GET /api/problems`, hidden-test redaction, or judge verdict logic.
- Do not show fake progress, success rates, submissions, or catalog entries.
- Keep existing timed challenge start/resume and navigation guard behavior.
- Keep the problem preview drawer backed by the redacted problem endpoint.
- Keep the page usable from 360px and keyboard-accessible in light/dark mode.
- No new dependencies.

## Review Focus

1. **Missing history** — existing profiles have no per-problem submission history. Persist only metadata from actual returned judge results; never persist source code or hidden test details.
2. **Old IndexedDB users** — bump DB schema without deleting existing profile/draft stores.
3. **Hidden-test leakage** — only request summaries and the existing redacted problem detail endpoint; never import the full catalog into client components.
4. **Unknown/empty data** — show loading, error, and empty states without treating unknown progress as solved or inventing results.
5. **Responsive filtering** — filters stay available in a mobile sheet; list rows and pagination remain usable at 360px.

---

### Task 1: Local submission metadata and status derivation

**Files:**
- Modify: `lib/storage/db.ts`
- Create: `types/submission.ts`
- Create: `lib/storage/submission-repository.ts`
- Modify: `lib/storage/profile-repository.ts`
- Modify: `components/app/workspace-view.tsx`
- Test: `tests/submission-repository.test.mjs`

**Interfaces:**
- `SubmissionRepository.recordSubmission(profileId, result)` records verdict metadata only.
- `SubmissionRepository.getAllForProfile(profileId)` returns newest first.
- `getProblemStatus(problemId, submissions)` returns `solved`, `attempted`, or `unsolved`.

- [ ] Write tests for recording and retrieving real verdict metadata, solved/attempted/unsolved precedence, profile isolation, and absence of source code/test payloads.
- [ ] Run tests to verify the new repository/status behavior fails before implementation.
- [ ] Add IndexedDB version 3 store and repository, preserving existing stores.
- [ ] Record actual `/api/judge` responses only; do not change API or judge logic.
- [ ] Run the focused repository tests and existing profile/storage tests.

### Task 2: Pure filter and pagination helpers

**Files:**
- Create: `lib/problems/problem-list.ts`
- Test: `tests/problem-list.test.mjs`

**Interfaces:**
- `filterProblemSummaries(problems, filters)` filters title/category/tags, difficulty, category, supported language, tag, and known local status.
- `paginateProblems(problems, requestedPage, pageSize)` returns a clamped page and slice.

- [ ] Test every filter independently, combined filters, empty matches, and final-page clamping.
- [ ] Run tests to verify they fail before implementation.
- [ ] Implement pure helpers without catalog imports or browser APIs.
- [ ] Run focused tests.

### Task 3: Responsive Challenges page and preview

**Files:**
- Modify: `components/app/challenges-view.tsx`
- Create: `components/app/problem-filters.tsx`
- Create: `components/app/problem-preview-sheet.tsx`
- Test: `tests/practice-problem-list.test.mjs`

- [ ] Add regression checks for accessible status/difficulty/category/language/tag controls, responsive filter sheet, semantic table, pagination, loading/error/empty states, and redacted preview endpoint.
- [ ] Replace pixel cards and uppercase copy with shared Button, Badge, Card, Table and neutral semantic status icons.
- [ ] Derive category/tag options from actual returned summaries.
- [ ] Preserve timed challenge start/resume and guard navigation from the Solve action.
- [ ] Run all required checks: `npx tsx --test tests/*.test.mjs`, `npm run lint`, `npx tsc --noEmit`, `npm run build`.
- [ ] Review diff for scope, data truth, hidden-test safety, and responsive/accessibility gaps; stop for owner review.

## Ruling

Ruling: Add a minimal profile-scoped local submission metadata store — required because status filters cannot be truthful or functional with the current app, which only stores the latest timed challenge and never persists ordinary judge results. This stores only actual verdict metadata, not source code, test inputs, expected outputs, or hidden test details; API contracts and judge calculations remain untouched.
