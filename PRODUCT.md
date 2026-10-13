# Product

<!-- impeccable:product-schema 1 -->

## Platform

web (Online-First Platform — Currently in Local Developer Preview)

## Users

- **Primary:** Programming students and learners practicing algorithmic challenges, completing structured lab exercises, and participating in timed programming contests (inspired by CodeChum).
- **Secondary:** Instructors, educators, and contest administrators organizing classroom problem sets, automated assessments, and student performance tracking.
- **Core Job:** Solve programming problems in Python 3, Java, C++, and C with immediate code execution feedback, deterministic automated judging verdicts, test case visibility, and progress analytics.

## Product Purpose

Exeku is an online-first programming education, practice, and competition platform designed to provide fast, reliable, and accessible coding education with deterministic automatic grading.

- **Tagline:** "Your Code. Your Machine."
- **Why it exists:** Modern coding education often divides between fragmented local developer setups that are difficult for beginners to configure, and heavy enterprise platforms with rigid workflows. Exeku bridges this with a responsive, browser-native programming practice platform featuring a rich Monaco editor, sandboxed multi-language execution, automated test evaluation, and timed contest capabilities.
- **Current Development Stage:** **Local Development / Developer Preview**. All execution, judging, and profile components are tested and developed in local development before any future production cloud deployment.
- **Definition of Success:** A student selects a programming problem, writes clean code in Python 3, Java, C++, or C, runs against sample inputs, submits to an automated sandbox judge, and receives a deterministic verdict (Accepted, Wrong Answer, etc.) within seconds.

## Positioning

Exeku provides a high-craft developer aesthetic paired with robust automated code assessment. Inspired by CodeChum, it focuses on core foundational languages (Python 3, Java, C++, C) and supports both individual self-paced problem solving and institutional classroom contests.

## Operating Context

- **Current Stage:** Local development workspace (`localhost:3000`), local sandbox evaluation via containerized Piston engine (`http://localhost:2000`) or mock adapter.
- **Future Production Stage:** Online-hosted web application with isolated execution microservices, server-authoritative submission queue, and contest infrastructure.
- **Workflows:**
  - Browsing problem catalogs with difficulty and language filters.
  - Solving problems inside an integrated Monaco code editor.
  - Running code against custom or sample standard input.
  - Submitting solutions for multi-test automated judging with hidden test case protection.
  - Inspecting execution telemetry (exit code, runtime duration, memory, compiler logs, test diffs).
  - Tracking progress and draft buffers in local profile storage (with planned server-authoritative contest identities in future phases).

## Capabilities and Constraints

- **Confirmed Capabilities:**
  - Interactive code editor powered by Monaco Editor (`monaco-editor`, `@monaco-editor/react`).
  - Multi-language support: Python 3, Java, C++, C.
  - Bounded concurrency execution queue designed for ~30 participant classroom contests.
  - Automatic judging engine with deterministic verdict calculation (AC, WA, CE, RE, TLE, MLE, IE).
  - Server-authoritative test case evaluation with hidden test input/output redaction.
  - Local profile and code draft persistence via IndexedDB (safe hydration without cloud lock-in during developer preview).
  - Retro pixel-art visual design system with Doticons integration.
- **Technical Constraints:**
  - **No Unsafe Execution:** Student code is strictly untrusted. Code execution must run inside an isolated sandbox (Piston/`isolate` container) with enforced CPU limits, memory limits, wall-clock timeouts, restricted filesystem access, and disabled outbound networking. Arbitrary unsandboxed host process execution is strictly prohibited.
  - **Local Development Boundaries:** No public cloud infrastructure (Vercel, Render, Oracle Cloud) or cloud databases are provisioned during this stage. Everything runs and verifies locally.
  - **Data Truth Guarantee:** Only display verified, real execution outputs and stored records. Never fabricate test passes or execution statistics.
  - **Modular Boundaries:** Frontend and execution engine are completely decoupled via standard JSON REST contracts (`POST /api/execute`, `POST /api/judge`).
- **Team Ownership Boundaries:**
  - **Primary Developer Owns:** Monaco workspace, code execution service, automatic judging engine, programming problems engine, contest infrastructure, deployment architecture, and Appearance Studio (Phase 2C).
  - **Teammate Owns:** Lessons, tutorials, curriculum explanations, and educational content modules.

## Brand Commitments

- **Name:** Exeku
- **Tagline:** "Your Code. Your Machine."
- **Aesthetic Direction:** Retro pixel-art developer aesthetic paired with modern functional clarity and accessibility.
- **Visual Identity Foundation:** Dark violet and neon-purple foundation accented with restrained pink and cyan highlights. High-contrast typography, pixel-inspired decorative elements and borders, clean interactive states.
- **Planned Appearance System (Phase 2C):** Future multi-theme engine supporting Pixel Arcade, Minimal SaaS, and Studio/CRM styles with configurable typography, font scaling, and high-contrast modes.

## Product Principles

1. **Deterministic Assessment:** Test cases and judging verdicts must be repeatable, transparent, and rigorous. Trailing whitespace and line endings are normalized consistently without obscuring meaningful output differences.
2. **Security First:** Untrusted student submissions must never execute directly on the application host. Isolation is an absolute requirement.
3. **Ergonomic Workspace:** Developers learn by coding. The editor, controls, standard input buffers, and output logs must remain distraction-free, responsive, and keyboard-accessible.
4. **Honest System Telemetry:** Clearly distinguish between sandbox execution output, compiler errors, runtime exceptions, and sandbox connectivity states.
