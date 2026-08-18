# End-to-end testing

The `e2e/` directory is reserved for Playwright browser tests that exercise
Mini Workout through user-visible workflows.

## Current status

There is currently no Playwright configuration, test project, or runnable E2E
script in this repository. This directory is intentionally kept as a future
integration boundary and should not be treated as an active test suite.

## Planned structure

When E2E testing begins, use a structure similar to:

```text
e2e/
  playwright.config.ts
  tests/
    web-load.spec.ts
    workout-discovery.spec.ts
  fixtures/
  pages/
```

Tests should describe user behavior, use accessible selectors, remain
independent, and avoid duplicating unit or component-test coverage.

## Planned workflow

The eventual workflow should install browsers, start the required app, run the
Playwright suite, and publish traces/reports on failure. Add the commands to
the root package scripts and [`docs/TESTING.md`](../docs/TESTING.md) when the
first E2E test is implemented.
