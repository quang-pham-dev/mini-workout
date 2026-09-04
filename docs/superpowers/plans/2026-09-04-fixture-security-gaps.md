# Fixture Security Gaps Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the remaining E2E fixture security gaps around public server environments, cleanup, lock ownership, and metadata secrets.

**Architecture:** Keep the existing fixture modules and make their contracts explicit. Public server startup uses a fixed allowlist, lock files use strict runtime parsing and only proven-dead owners are reclaimed, and setup cleanup uses nested `finally` blocks while preserving the setup failure.

**Tech Stack:** TypeScript, Node test runner, Playwright, pnpm/Turbo.

---

### Task 1: Public Environment Policy

**Files:**

- Modify: `e2e/playwright.config.ts`
- Test: `e2e/fixtures/policy.test.ts` (or the existing policy test location)

- [ ] Add tests proving inherited DB/auth/secret variables are absent and only the documented runtime allowlist plus fixed safe values are returned.
- [ ] Run the focused policy tests and confirm failure against the current spread-based implementation.
- [ ] Implement an explicit environment object; preserve only process execution basics needed by the server and fixed non-secret runtime values.
- [ ] Run policy tests and public Playwright smoke with `DATABASE_URL` and `E2E_DATABASE_URL` unset.

### Task 2: Lock Owner Validation

**Files:**

- Modify: `e2e/fixtures/database-lock.ts`
- Test: `e2e/fixtures/database-lock.test.ts`

- [ ] Add tests for malformed JSON, non-object owners, missing fields, non-positive/non-integer PIDs, empty tokens, unknown process status, and valid stale-owner takeover.
- [ ] Run the focused lock tests and confirm the malformed-owner cases fail or are unsafe under the current casts.
- [ ] Add a strict runtime parser for the expected owner schema and reject unknown or malformed owners without deleting the lock.
- [ ] Use the parser in acquisition and release paths; retain takeover only for validated owners with `processStatus === 'dead'`.
- [ ] Run at least 15 lock/policy regression tests.

### Task 3: Cleanup and Metadata

**Files:**

- Modify: `e2e/fixtures/setup-lifecycle.ts`, `e2e/global.setup.ts`, `e2e/global.teardown.ts`
- Test: `e2e/fixtures/setup-lifecycle.test.ts`, metadata/teardown tests as needed

- [ ] Add tests proving metadata removal and lock release are each attempted when the other cleanup action throws, and the original setup error is preserved.
- [ ] Add a regression assertion that metadata contains only the derived database key and run token, never the database URL or credentials.
- [ ] Implement nested `try/finally` cleanup and metadata writes using only `{ key, token }`; update teardown reads accordingly.
- [ ] Run focused lifecycle and metadata tests.

### Task 4: Verification and Commit

**Files:**

- Modify: `docs/TESTING.md` if behavior or commands need clarification.

- [ ] Run public E2E with database variables removed.
- [ ] Run `pnpm format`, `pnpm lint`, `pnpm check-types`, `pnpm test`, and `pnpm docs:check`.
- [ ] Inspect `git diff` and `git status`, stage only intended files, and commit `test: close fixture security gaps`.
- [ ] Record exact command results and commit hash.
