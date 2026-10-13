# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Primary:** Classroom students and teachers in school computer lab settings with restricted, intermittent, or zero internet connectivity.
- **Secondary:** Self-directed learners and programming novices learning core programming fundamentals (Python, Java, C++, C) on personal machines without relying on internet access or cloud subscriptions.
- **Core Job:** Learn, practice, and teach structured programming through hands-on exercises, immediate local code execution, automated grading, and offline curriculum progression without cloud dependencies or privacy concerns.

## Product Purpose

Exeku is an offline-first programming education platform built to make software engineering education resilient, accessible, and self-contained on the student's own computer.

- **Tagline:** "Your Code. Your Machine."
- **Why it exists:** Modern coding education heavily relies on cloud IDEs (Replit, Codecademy, LeetCode) requiring continuous broadband, remote compute, user tracking, and cloud accounts. In environments with poor connectivity, firewall restrictions, or limited hardware, this creates insurmountable learning barriers.
- **Definition of Success:** A student seated at an offline computer in a school lab can launch Exeku, write code in Python, Java, C++, or C, execute it locally, receive instant test results and grading, and progress through lessons with zero network packets leaving their machine.

## Positioning

Unlike cloud-dependent coding platforms and web IDEs, Exeku runs, compiles, and evaluates code entirely on the user's local machine. It combines the polish of a modern interactive learning environment with the reliability and independence of a local developer setup—no cloud authentication, no remote servers, no telemetry, and no subscription lock-in.

## Operating Context

- **Environments:** School computer labs (Windows workstations), home laptops with limited or no internet access, air-gapped or restricted institutional environments.
- **Workflows:** Browsing lesson curricula, writing code in an integrated Monaco editor, executing against predefined unit tests/problem test suites, reviewing compiler output and automated grades, and tracking local progress.
- **Tools & Systems:** Local Next.js application shell, Monaco Editor, local compilers/interpreters (Python 3, Java, C++, C), local file/state persistence.

## Capabilities and Constraints

- **Confirmed Capabilities:**
  - Interactive code editor powered by Monaco Editor (`monaco-editor`, `@monaco-editor/react`).
  - Structured curriculum navigation and problem sets.
  - Local test runner and automated grading engine (planned roadmap).
  - Offline AI learning assistant and local profile system (planned roadmap).
- **Technical Constraints:**
  - **Offline-First:** All fonts, icons, styling, and static assets must be bundled locally. No external runtime CDN dependencies.
  - **No Cloud Dependencies:** No cloud authentication, third-party auth providers, or remote telemetry backends.
  - **Application Shell:** Responsive desktop-first local web application (Next.js 16 App Router) designed for local execution and future packaged standalone Windows distribution.
  - **Planned Languages:** Python 3, Java, C++, C.
- **Explicitly Undecided / Future:** Local engine execution sandboxing model, exact local user profile persistence schema, offline local LLM runtime parameters.

## Brand Commitments

- **Name:** Exeku
- **Tagline:** "Your Code. Your Machine."
- **Aesthetic Direction:** Retro pixel-art developer aesthetic paired with modern functional clarity and accessibility.
- **Visual Identity Foundation:** Dark violet and neon-purple foundation accented with restrained pink and cyan highlights. High-contrast typography, pixel-inspired decorative elements and borders, clean interactive states. Avoids excessive bloom/glow, gratuitous animations, or generic corporate SaaS design.
- **Voice:** Direct, empowering, focused, and developer-centric.

## Evidence on Hand

- **Codebase Scaffold:** Next.js 16 App Router with Turbopack, React 19, TypeScript, Tailwind CSS v4, shadcn/ui with Base UI primitives (`base-nova` preset), and Monaco Editor packages installed.
- **Specification Authority:** `AGENTS.md` containing architectural rules, technology stack definitions, git workflows, and offline-first standards.
- **Absence Constraints:** No committed lesson database, problem banks, or local execution binaries currently exist in repository; future work must not assume or fabricate pre-existing curricula.

## Product Principles

1. **Zero-Cloud Autonomy:** Every core workflow—curriculum access, code editing, compilation, test grading, and progress tracking—must function fully severed from the internet.
2. **The Machine Is the Lab:** Treat the user's computer as a first-class execution environment. Respect local resources, privacy, and user files with no remote surveillance or cloud lock-in.
3. **Immediate Local Feedback:** Code execution and automated grading must happen instantly on-device so students stay in productive learning flow without waiting on network latency.
4. **Accessible Craft:** Combine nostalgic retro developer personality with rigorous readability, keyboard navigation, and ergonomic layout hierarchy.

## Accessibility & Inclusion

- Desktop-centric keyboard accessibility and full navigation support.
- High functional clarity and contrast ratios for diverse display hardware in educational labs.
- Resilient layouts adapting across standard desktop and laptop resolutions without horizontal overflow or cramped editor panes.
