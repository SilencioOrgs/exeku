<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# EXEKU — AGENT DEVELOPMENT WORKFLOW & PROJECT SPECIFICATION

## 1. Project Identity

- **Product**: Exeku
- **Tagline**: Your Code. Your Machine.
- **Type**: Online-first programming practice, education, and competition platform (inspired by CodeChum)
- **Current Development Status**: Local Development / Developer Preview (no public deployment to Vercel/Render)
- **Supported Languages**: Python 3, Java, C++, C
- **Primary Workflows**: Problem solving, code execution, automated test judging, programming contests, student telemetry
- **Future Roadmap**: Online-hosted multi-tenant web deployment, server-authoritative contest identities, minimalist Light/Dark UI, instructor-managed lessons, offline AI tutor

---

## 2. Technology Stack & Foundation

- **Framework**: Next.js 16 App Router (with Turbopack and React 19)
- **Language**: TypeScript (`tsconfig.json`)
- **Styling**: Tailwind CSS v4 (`@tailwindcss/turbopack`, `tw-animate-css`, `app/globals.css`)
- **UI Components**: shadcn/ui configured with Base UI primitives (`@base-ui/react`), Nova preset (`style: "base-nova"`), and Lucide React icons (`components.json`)
- **Icons**: Lucide stroke icons via the existing compatibility wrapper (`components/retro/dot-icon.tsx`)
- **Editor**: Monaco Editor (`monaco-editor`, `@monaco-editor/react`)
- **Storage**: IndexedDB local profiles, drafts, and profile-scoped submission metadata (v3 schema)
- **Execution Sandbox Target**: Piston API (`POST /api/v2/execute`) via isolated container sandbox
- **Package Manager**: npm (use `npm.cmd` / `npx.cmd` in Windows PowerShell if execution policies restrict script loading)
- **Rule**: Preserve existing configuration and dependencies. Never recreate or reinitialize the Next.js project.

---

## 3. Team Development Boundaries

Exeku is built with clean ownership boundaries between collaborative modules:

### Primary Developer Owns:
- Monaco workspace and code editing experience
- Code execution service and sandbox adapter layer
- Automatic judging engine, verdict calculation, and test case evaluation
- Programming problems library and problem schemas
- Timed contest and assessment infrastructure
- Deployment architecture and execution queues
- Shared Light/Dark appearance and minimalist UI

### Teammate Owns:
- Lessons, tutorials, and curriculum explanations
- Learning-content presentation modules
- Educational walkthroughs and non-coding quizzes

**Rule of Decoupling**: Teammate-owned lessons reference programming problems only through loose IDs defined in `types/lesson-integration.ts`. Do not modify or tightly couple lesson content to the judge.

---

## 4. Secure Execution & Judging Architecture

Student code is strictly untrusted:

1. **No Raw Host Execution**: NEVER execute submitted code directly on the host operating system using unrestricted Node.js `child_process.exec`, PowerShell, or the Next.js server process.
2. **Sandbox Requirements**: Code execution must run inside an isolated sandbox (Piston/`isolate` container or equivalent) with:
   - CPU time limits (e.g., 2000ms - 5000ms)
   - Wall-clock timeouts
   - Memory limits (e.g., 128MB - 256MB)
   - Restricted filesystem access
   - Outbound network access completely disabled
   - Maximum output size limits
3. **Sandbox Unavailability Protocol**: If a local sandbox container (e.g., Piston on port 2000) is not running on the development machine, the system must clearly display `SANDBOX SERVICE UNAVAILABLE` with exact setup instructions. Never silently substitute unsafe host execution.
4. **Bounded Concurrency**: Submissions pass through an in-memory execution queue (`lib/execution/queue.ts`) designed for classroom competitions of ~30 concurrent participants.
5. **Hidden Test Case Protection**: Authoritative test suites remain server-side. Hidden test inputs and expected outputs are never leaked to client bundles or API error responses.

---

## 5. Design System & Aesthetics

Exeku uses **one minimalist SaaS design system**, not multiple visual themes.

- **Theme:** Light and Dark only, selected using the shared header toggle. The previous Style/Palette/Appearance Studio selectors must not return.
- **Colors:** Neutral zinc/black/white surfaces with accessible contrast and reserved semantic colors for success, warning and errors.
- **Typography:** Geist Sans for the interface, Geist Mono for code. Do not introduce pixel fonts, arcade borders or neon effects.
- **Surfaces:** Rounded cards and controls (8–12px radii), subtle 1px borders, generous spacing, restrained motion.
- **Components:** Reuse shadcn/ui, Base UI, Tailwind v4 and existing shared primitives. Old `Pixel*` component names are only compatibility aliases; their visuals must remain modern.
- **Persistence:** Keep reading old saved appearance IDs safely, but expose only the Light/Dark toggle. Never delete profiles or editor drafts when changing the UI.
- **Accessibility:** Keyboard, focus-visible, responsive layout, reduced motion and sensible color contrast are required.

---

## 6. Skill Orchestration

Always invoke skills through verified, installed interfaces.

### Superpowers
- **Location**: Installed globally (`~/.gemini/config/plugins/superpowers/skills`).
- Use planning (`brainstorming`, `writing-plans`, `executing-plans`), debugging (`systematic-debugging`), and verification (`verification-before-completion`).

### Impeccable
- **Location**: `C:\Users\Asnor\.gemini\config\skills\impeccable`.
- Consult for UX review, workspace ergonomics, visual hierarchy, responsive layouts, and accessibility audits.

### Caveman
- Keep agent exploration focused, edits surgical, and communication concise without sacrificing quality.

### GitHub CLI (`gh`)
- Location: `C:\Program Files\GitHub CLI\gh.exe` authenticated with `SilencioOrgs`.
- Manage feature branches, atomic commits, PRs, and merges. Never force-push to `main`.

---

## 7. Quality and Verification Standards

For all development tasks, execute and verify:
- `npm.cmd run lint` (0 errors, 0 warnings)
- `npx.cmd tsc --noEmit` (0 errors)
- `npx.cmd tsx --test tests/*.test.mjs` (all tests passing)
- `npm.cmd run build` (all routes compiling)

**Integrity Rule**: Never report tests or verification checks as passed unless they were actually executed and confirmed with output evidence.

<!-- BEGIN:nextjs-agent-feedback -->

## Report Next.js feedback

The project owner enabled `experimental.agentFeedback`, authorizing this feedback pass. When enabled, `next dev` writes this block and restores it if removed. Commit `AGENTS.md` with your work to keep the tree clean.

During the current user request, retain anonymized facts as feedback candidates for meaningful or recurring Next.js issues:

- Crashes, hangs, OOMs, or unexpected slowness
- Incorrect behavior, output, errors, or diagnostics
- Missing, unclear, or conflicting documentation
- Unexpected CLI, codemod, Skill, or upgrade behavior and non-obvious workarounds

Continue the current user request without reporting immediately. Ignore routine debugging and unverified changes. Never retain code, logs, paths, URLs, secrets, personal information, or project-specific data.

Keep a qualifying candidate through the reporting pass even if you resolve or work around it. A successful fix changes the report outcome; it does not erase the friction that qualified it.

Before the final response, run one reporting pass. If candidates remain, from this file's directory run `node node_modules/next/dist/bin/next internal agent-feedback-instructions` once without piping or truncating its output. Follow its output or error guidance. If a network sandbox blocks it, retry with network access; if it still returns no output, continue normally.

<!-- END:nextjs-agent-feedback -->
