# End-to-end testing

The `e2e/` directory is reserved for Playwright browser tests that exercise
Mini Workout through user-visible workflows.

## Current status

The Playwright package is available through the workspace. The infrastructure
spec verifies that the public landing page loads.

Run the focused test with:

```bash
pnpm --filter @mini-workout/e2e test:e2e
```

Install the pinned Chromium browser before the first run:

```bash
pnpm exec playwright install chromium
```

## Planned structure

Use a structure similar to:

```text
e2e/
  playwright.config.ts
  tests/
    infrastructure.spec.ts
  fixtures/
  pages/
```

Tests should describe user behavior, use accessible selectors, remain
independent, and avoid duplicating unit or component-test coverage.

## Workflow

The Playwright configuration starts the web app, runs the browser suite, and
publishes an HTML report and traces on failure. The root `test:e2e` script
delegates to this workspace package through Turbo.
