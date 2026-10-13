<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# EXEKU — AGENT DEVELOPMENT WORKFLOW & PROJECT SPECIFICATION

## 1. Project Identity

- **Product**: Exeku
- **Tagline**: Your Code. Your Machine.
- **Type**: Offline-first programming education platform
- **Target Platform**: Windows
- **Planned Supported Languages**: Python 3, Java, C++, C
- **Authentication**: No cloud authentication required. Local user profiles will be implemented later.
- **Future Roadmap**: Local code execution engine, automatic grading system, and offline AI assistant.

---

## 2. Technology Stack & Foundation

- **Framework**: Next.js 16 App Router (with Turbopack and React 19)
- **Language**: TypeScript (`tsconfig.json`)
- **Styling**: Tailwind CSS v4 (`@tailwindcss/turbopack`, `tw-animate-css`, `app/globals.css`)
- **UI Components**: shadcn/ui configured with Base UI primitives (`@base-ui/react`), Nova preset (`style: "base-nova"`), and Lucide React icons (`components.json`)
- **Editor**: Monaco Editor planned for coding workspace (`monaco-editor`, `@monaco-editor/react` installed)
- **Package Manager**: npm (use `npm.cmd` / `npx.cmd` in Windows PowerShell if execution policies restrict script loading)
- **Rule**: Preserve existing configuration and dependencies. Never recreate or reinitialize the Next.js project.

---

## 3. Design System & Aesthetics

Exeku features a distinct developer aesthetic that balances retro nostalgic craft with modern accessibility:

- **Theme & Vibe**: Retro pixel-art developer aesthetic with high functional clarity.
- **Color Palette**:
  - Base: Dark violet and neon-purple foundation.
  - Accents: Restrained pink and cyan accents for focus and highlights.
- **Component Style**: Pixel-inspired buttons, cards, borders, badges, and decorative elements paired with smooth, robust interactive states.
- **Layout**: Accessible, modern layouts; fully responsive across mobile, tablet, and desktop breakpoints.
- **Typography**:
  - Branding & Headings: Pixel typography.
  - Body & UI: Highly readable sans-serif text.
  - Code & Editor: Monospace font.
- **Design Boundaries**:
  - Avoid unnecessary gradients, excessive bloom/glow, generic SaaS corporate templates, visual clutter, and animation overload.

---

## 4. Skill Orchestration

Always invoke skills through verified, installed interfaces. Do not invent slash commands.

### Superpowers
- **Location**: Installed globally (`~/.gemini/config/plugins/superpowers/skills`).
- **Workflows**:
  - Use planning workflows (`brainstorming`, `writing-plans`, `executing-plans`) for substantial features.
  - Use debugging workflow (`systematic-debugging`) for reproducible bugs before modifying code.
  - Apply testing and verification workflows (`test-driven-development`, `verification-before-completion`).
  - Avoid unnecessary planning overhead for trivial changes or mechanical edits.

### Impeccable
- **Location & Status**: Physical skill files and CLI binary exist at `C:\Users\Asnor\webprojects\.gemini\skills\impeccable`. Because `exeku` is an isolated git root, the agent harness will only discover it if mounted or referenced directly.
- **Workflows**:
  - Consult design guidance for new user interfaces and surfaces.
  - Apply critique, audit, and polish workflows after visual implementation.
  - Review typography, spacing, accessibility (a11y), interaction states, and responsiveness.
  - Preserve existing product design decisions unless a redesign is explicitly requested.

### Caveman
- **Location**: Installed globally (`~/.gemini/config/plugins/caveman/skills`).
- **Workflows**:
  - Follow installed guidance for efficient agent communication, exploration, and execution.
  - Keep progress reports, diff summaries, and status updates concise.
  - **Constraint**: Never sacrifice code quality, requirements, test results, or important diagnostic information for token savings.

### GitHub CLI (`gh`)
- **Location**: Installed at `C:\Program Files\GitHub CLI\gh.exe` (v2.102.0). Authenticated with account `SilencioOrgs` (scopes: `repo`, `workflow`, `gist`, `read:org`).
- **Execution Note**: If `gh` is not found in the current PowerShell PATH, invoke via `& "C:\Program Files\GitHub CLI\gh.exe"` or update `$env:PATH`.
- **Workflows**:
  - Support private repositories.
  - Verify authentication and remote configuration before attempting git push or pull request operations.
  - **Security**: Never expose tokens, secrets, or credentials in commit messages, logs, or agent outputs.

---

## 5. Git and Branching Rules

- `main` is the stable, protected production branch.
- **Branch Naming**:
  - `feat/<short-description>` for new features
  - `fix/<short-description>` for bug fixes
  - `chore/<short-description>` for maintenance or configuration updates
  - `refactor/<short-description>` for refactoring without behavior changes
- **Rules of Engagement**:
  - Keep commits focused, atomic, and descriptive.
  - Never force-push to `main`.
  - Never delete unrelated files or discard existing user changes.
  - Never overwrite unrelated uncommitted changes.
  - Do not create unrequested GitHub repositories or replace the existing remote (`origin: https://github.com/SilencioOrgs/exeku.git`).

### Task Completion Protocol
For any completed development task:
1. **Review**: Review all changes in working tree (`git diff`, `git status`).
2. **Verify**: Run all applicable verification checks (`lint`, `tsc`, `build`).
3. **Fix**: Resolve any failures caused by the task.
4. **Commit**: Commit the verified changes with a descriptive message.
5. **Push**: Push the working branch to the configured private repository (`origin`).
6. **PR**: Create a pull request using `gh` where appropriate.
7. **Merge**: Merge into `main` only when checks pass, required reviews are satisfied, and repository permissions permit merging.
8. **Sync**: Synchronize local `main` branch after merge (`git checkout main`, `git pull origin main`).
9. **Blocker Reporting**: If authentication, permissions, missing remotes, reviews, or verification fail at any step, report the blocker clearly. Never claim a push or merge succeeded unless verified.

---

## 6. Quality and Verification Standards

For relevant frontend changes, run:
- `npm run lint` (or `npm.cmd run lint`)
- `npx tsc --noEmit` (or `npx.cmd tsc --noEmit`)
- `npm run build` (or `npm.cmd run build`)

Also verify:
- **Responsive Layout**: Test layouts across mobile, tablet, and desktop viewports.
- **Accessibility**: Full keyboard accessibility, proper ARIA attributes, semantic HTML.
- **Navigation**: Functional routing and interactive states.
- **Resilience**: Proper loading skeletons, empty states, and error handling.
- **Clean Dependencies**: No extraneous packages added.
- **Console Health**: Zero browser console errors when browser testing is performed.
- **Asset Integrity**: No unapproved runtime CDN requests.
- **Integrity Rule**: Never report tests or verification checks as passed unless they were actually executed and confirmed.

---

## 7. Offline-First Architecture Requirements

- **Local Assets**: All fonts, icons, styles, and static assets must be bundled locally. No external runtime CDN dependencies.
- **No Cloud Lock-in**: Do not add unnecessary cloud services or cloud authentication backends.
- **API Boundaries**: Do not introduce backend APIs without explicit user approval.
- **Local Engine Compatibility**: Preserve architecture compatibility for future local execution engines (Python 3, Java, C++, C) and offline AI models.
- **Environment Distinction**: Distinguish development-server behavior (`next dev`) from packaged offline standalone deployment.

---

## 8. Communication Guidelines

- State the work scope clearly before starting substantial tasks.
- Give concise, informative progress updates.
- Explain significant architectural and design choices.
- Report actual verification command outputs and evidence.
- Summarize modified files and Git working tree status.
- Immediately identify and report blockers rather than silently skipping required steps.
