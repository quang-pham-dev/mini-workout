# Phase 04 — Verification

## Goal

Produce evidence that the change works and does not regress affected behavior.

## Required checks

Run the narrowest useful checks first, then expand based on risk:

- formatting and lint for changed workspaces;
- type checking for affected packages/apps;
- focused unit/component tests;
- database migration/client checks when persistence changes;
- Playwright journeys for user-visible browser behavior;
- architecture checks for Next.js pages, feature ownership, Suspense, and
  server/client boundaries when App Router code changes;
- cache-tag and invalidation checks when `use cache`, `cacheTag`, `updateTag`,
  or `revalidateTag` changes;
- for `apps/admin` changes, run `pnpm --filter @mini-workout/admin check-types`
  (this also regenerates route types via `tsr generate`) and
  `pnpm --filter @mini-workout/admin lint`;
- **`pnpm exec turbo boundaries`** — run whenever package imports change,
  a new workspace dependency is added, or any `package.json` changes;
- **`pnpm --filter @mini-workout/storybook build`** — run when `packages/ui`
  components are added or changed (catches a11y violations and broken imports);
- full `pnpm build`, `pnpm check-types`, or `pnpm test` when the change is
  cross-workspace or the focused checks cannot provide confidence;
- **`pnpm docs:check`** in full verification sweeps or when documentation or
  cross-references change.

Use Turborepo filters or `--affected` where appropriate. Never claim a check
passed without running it; distinguish passed, failed, skipped, and blocked.

## UI verification

Check loading, empty, error, success, keyboard, focus, responsive, and reduced
motion states when applicable. Capture screenshots or recordings for meaningful
visual changes. For `packages/ui` components, include Storybook build evidence
and note any `addon-a11y` findings.
