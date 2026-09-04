# Theme Review Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve explicit Light visual parity while making custom theme persistence, hydration, and menu interactions robust and accessible.

**Architecture:** Keep the existing custom `ThemeProvider` and `ThemeToggle`. The provider will use stable Light state for server/client hydration, adopt the bootstrap/storage preference after mount through safe storage helpers, and apply resolved classes/data attributes. Landing CSS Modules will use global resolved-theme selectors instead of OS media queries.

**Tech Stack:** Next.js App Router, React, TypeScript, CSS Modules, Vitest/jsdom, Playwright.

---

### Task 1: Theme provider regression tests

**Files:**

- Modify: `apps/web/tests/theme.test.tsx`

- [x] Add tests for explicit Light remaining Light when `matchMedia` reports dark, server markup staying stable while persisted Dark hydrates, storage reads/writes/listener failures being ignored, and outside/Tab menu dismissal.
- [x] Run the focused Vitest file and confirm the new assertions fail for the current implementation.

### Task 2: Provider and menu implementation

**Files:**

- Modify: `apps/web/src/components/theme/theme.tsx`

- [x] Add safe storage accessors and mount state; do not read persisted client state during the initial render.
- [x] Synchronize bootstrap/storage preference after mount, apply the resolved theme, and handle storage events without throwing.
- [x] Keep the trigger's pre-mount markup stable and implement outside pointer dismissal plus focus-leaving Tab dismissal.
- [x] Preserve menuitemradio arrow-key navigation and Escape focus restoration.
- [x] Run the focused tests until green.

### Task 3: Landing selectors and metadata

**Files:**

- Modify: `apps/web/src/app/page.module.css`
- Modify: `apps/web/src/app/globals.css`
- Modify: `apps/web/src/app/layout.tsx`
- Modify: `apps/web/tests/theme.test.tsx`
- Modify: `e2e/tests/theme.spec.ts`

- [x] Replace landing `prefers-color-scheme` rules and unsafe image selectors with CSS Module-safe selectors based on resolved `html.light`/`html.dark` classes.
- [x] Use the design-system dark background value for `theme-color` in both bootstrap and runtime metadata.
- [x] Update focused and runnable public E2E expectations, including a DB-free `/theme-preview` route and an approved deterministic System screenshot.

### Task 4: Full verification and commit

**Files:**

- No unrelated files.

- [x] Run web tests, lint, type checking, formatting, production build, docs checks, public E2E, and relevant package tests.
- [x] Inspect the final diff and stage only theme-related files.
- [x] Commit with `test: finalize theme keyboard and visual coverage`.
