# Phase 05 — Review

## Goal

Review the diff as a maintainer before handoff.

## Review checklist

- Does the implementation satisfy every acceptance criterion?
- Are ownership and package boundaries correct? Run `pnpm exec turbo boundaries`
  and verify that `eslint-plugin-boundaries` reports no violations for the
  affected app (`apps/web/eslint.config.js` or `apps/admin/eslint.config.js`).
- Are error paths, authorization, validation, and telemetry safe? Check against
  the non-negotiable rules in `docs/ERROR_HANDLING_CONVENTION.md`.
- Are changed UI states accessible and consistent with the design system?
- Are queries efficient and transactions/migrations safe?
- Are tests behavior-focused and resilient rather than implementation-coupled?
- Did the change introduce dead code, duplicated logic, secrets, or unrelated churn?
- Are documentation and environment instructions current?
- For `apps/admin` changes: confirm that routes only import through
  `features/*/index.ts`, features do not import routes or UI components, and
  `libs` do not import features. See `apps/admin/docs/ARCHITECTURE.md`.
- If reviewing a branch or PR, use `code-review` only with an explicit fixed
  point and a known spec source. It requires two separate axes: standards and
  spec. If its issue-tracker prerequisite is absent, use this checklist and
  report that limitation instead of inventing a spec.

Review the actual diff and status, not only the files that were intentionally
edited. Resolve findings or explicitly list them as follow-up work.
