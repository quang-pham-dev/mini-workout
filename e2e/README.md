# End-to-end testing

The `e2e/` directory is reserved for Playwright browser tests that exercise
Mini Workout through user-visible workflows.

## Current status

The Playwright package is available through the workspace. The infrastructure
spec verifies that the public landing page loads.

The installed Playwright version does not expose `reducedMotion` as a context
option, so tests set `no-preference` through `page.emulateMedia` instead.

Run the default public-only suite without a database:

```bash
pnpm test:e2e
```

To select the public project explicitly, run:

```bash
pnpm --filter @mini-workout/e2e test:e2e -- --project=public
```

Run the database safety policy without an app or database:

```bash
pnpm --filter @mini-workout/e2e test:policy
```

Run the database-backed fixtures with an explicitly disposable local database:

```bash
E2E_DATABASE_URL='postgresql://user:password@127.0.0.1:5432/mini_workout_e2e' DATABASE_URL='postgresql://user:password@127.0.0.1:5432/mini_workout_e2e' pnpm test:e2e -- --project=db
```

Both `E2E_DATABASE_URL` and `DATABASE_URL` are required for database-backed E2E
runs and must be identical. The selected URL must use the PostgreSQL protocol,
resolve to `localhost`, `127.0.0.1`, or `[::1]`, and use exactly one of these database names: `e2e`, `test`,
`mini_workout_e2e`, or `mini_workout_test`. Production hosts and names that
merely contain `test` or `e2e` are rejected. The canonical URL is propagated to
Prisma migrate, seed, fixture setup, and the Next web server.

Public-only startup receives an explicit sanitized environment with database
variables blocked by a loopback port that cannot connect to a real database.

The E2E server always starts fresh and never reuses an already-running Next
server, preventing a database-backed run from using a different `DATABASE_URL`.

Lock, auth-state, and metadata paths are keyed by a SHA-256 hash of the
canonical database URL. Teardown reads only the metadata for its own run.
Incomplete and permission-protected locks are retained as live or unknown.

Install the pinned Chromium browser before the first run:

```bash
pnpm --filter @mini-workout/e2e exec playwright install chromium
```

## Structure

The current infrastructure uses:

```text
e2e/
  playwright.config.ts
  global.setup.ts
  global.teardown.ts
  fixtures/
    database.ts
    database-env.ts
    database-policy.test.ts
    test.ts
  tests/
    infrastructure.spec.ts
    fixtures.spec.ts
```

Tests should describe user behavior, use accessible selectors, remain
independent, and avoid duplicating unit or component-test coverage.

## Workflow

The Playwright configuration starts the web app, runs the browser suite, and
publishes an HTML report and traces on failure. The root `test:e2e` script
delegates to this workspace package through Turbo.
