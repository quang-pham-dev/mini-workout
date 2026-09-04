# E2E Fixture Contracts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make E2E database configuration explicit, prevent unsafe concurrent fixture runs, and clean fixture data after database-backed Playwright runs.

**Architecture:** Keep the approved disposable-database validator as the single environment boundary. Playwright will always register the public project, while database setup and fixture projects are conditionally registered only when both exact-match environment variables exist. A temp-directory lock keyed by the database URL will be acquired during setup and released during teardown; teardown will remove the known E2E users, whose cascading relations remove auth and interaction records.

**Tech Stack:** TypeScript, Node test runner, Playwright, Prisma, PostgreSQL, pnpm.

---

### Task 1: Enforce Database Environment Contract

**Files:**

- Modify: `e2e/fixtures/database-env.ts`
- Modify: `e2e/fixtures/database-policy.test.ts`

- [ ] **Step 1: Add failing tests for each missing variable and mismatch.**
- [ ] **Step 2: Run `pnpm --filter @mini-workout/e2e test:policy` and confirm the missing-variable cases fail.**
- [ ] **Step 3: Require both variables, reject missing-one and mismatch, then retain disposable URL validation.**
- [ ] **Step 4: Rerun the policy suite and confirm all cases pass.**

### Task 2: Make Playwright Public-Only by Default

**Files:**

- Modify: `e2e/playwright.config.ts`
- Modify: `e2e/README.md`
- Modify: `docs/TESTING.md`

- [ ] **Step 1: Add or update policy/config tests to assert public is always present and DB projects are absent unless both variables exist.**
- [ ] **Step 2: Run the focused tests and confirm the current unconditional DB projects fail the new behavior.**
- [ ] **Step 3: Build the project list from the both-present condition and document exact public-only and DB-backed commands.**
- [ ] **Step 4: Run `pnpm --filter @mini-workout/e2e test:e2e --project=public` without DB variables.**

### Task 3: Guard Concurrent Database Fixtures

**Files:**

- Create: `e2e/fixtures/database-lock.ts`
- Create: `e2e/fixtures/database-lock.test.ts`
- Modify: `e2e/global.setup.ts`
- Modify: `e2e/global.teardown.ts`

- [ ] **Step 1: Write tests showing one lock owner can acquire/release and a second owner for the same database is rejected.**
- [ ] **Step 2: Run the lock test and confirm it fails before the lock implementation exists.**
- [ ] **Step 3: Implement an exclusive temp lock containing the owning process identity, reject a live competing owner, and safely remove only the owned lock.**
- [ ] **Step 4: Acquire the lock before migrations/seeding and release it during teardown, including setup-failure cleanup.**
- [ ] **Step 5: Run the lock and policy tests.**

### Task 4: Clean Database Fixtures in Teardown

**Files:**

- Modify: `e2e/fixtures/database.ts`
- Modify: `e2e/global.teardown.ts`
- Modify: `e2e/fixtures/database-policy.test.ts`

- [ ] **Step 1: Add a testable cleanup function that rejects unapproved databases and deletes only the known E2E users.**
- [ ] **Step 2: Run the focused test and confirm it fails before cleanup is implemented.**
- [ ] **Step 3: Implement cleanup through Prisma user deletion with cascading related records, then invoke it only when a DB-backed setup acquired the lock.**
- [ ] **Step 4: Keep auth-directory removal unconditional and release the lock after DB cleanup.**
- [ ] **Step 5: Run focused tests and inspect the diff for unrelated changes.**

### Task 5: Full Verification and Commit

**Files:**

- Verify only: files changed by Tasks 1-4 and the plan document

- [ ] **Step 1: Run policy tests, public E2E, and DB-backed setup only if both matching variables point to an approved disposable database.**
- [ ] **Step 2: Run `pnpm check-types`, `pnpm lint`, `pnpm format`, and `pnpm docs:check`.**
- [ ] **Step 3: Review `git status`, `git diff`, and recent history; stage only intended files.**
- [ ] **Step 4: Commit with `test: finalize E2E fixture contracts`.**
- [ ] **Step 5: Verify the commit hash and clean intended-file diff state, then report exact command results.**
