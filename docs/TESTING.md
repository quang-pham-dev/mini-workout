# Testing Guide

## Test layers

Testing is incremental and feature-owned. A feature is not considered complete
without the smallest useful tests at the relevant layers.

```text
unit                 pure functions, schemas, transformations
component            UI behavior, keyboard/focus, accessibility states
integration          data/service boundaries and error mapping
E2E                  critical user journeys in a production-like app
smoke                deployment health and essential route availability
```

### Unit and component tests

Unit tests currently live in the package they cover. The UI package uses
Vitest with the shared React/jsdom configuration:

```bash
pnpm --filter @mini-workout/ui test
pnpm --filter @mini-workout/ui test:coverage
```

Use behavior-focused names such as:

```text
renders the workout card title
disables the button when the disabled prop is set
```

### Storybook

Reusable UI components should have stories when their visual states matter:

```bash
pnpm --filter @mini-workout/storybook dev
pnpm --filter @mini-workout/storybook build
```

Stories live beside components under `packages/ui/src/components`.
The Storybook 10 `addon-a11y` configuration uses `test: 'error'` for supported
accessibility runs. The official `addon-vitest` browser integration is
intentionally not enabled: the current Vite 8 setup has incompatible CommonJS
browser dependencies. Story coverage therefore stays build-compatible until
that dependency boundary is upgraded deliberately.

The design-system foundation has focused contract checks:

```bash
pnpm --filter @mini-workout/design-system test
pnpm --filter @mini-workout/design-system check-foundation
```

These cover token registration, Light/Dark parity, shared keyframes, consumer
token references, and global CSS ownership.

### End-to-end tests

The `e2e/` workspace contains the Playwright configuration and runnable browser
checks for the public landing page and the DB-free `/theme-preview` route. The
default suite is public-only and does not require a database:

```bash
pnpm test:e2e
```

Run the public project explicitly with:

```bash
pnpm --filter @mini-workout/e2e test:e2e -- --project=public
```

Database-backed E2E runs require both environment variables to contain the same
approved disposable database URL. Use a portable inline environment invocation:

```bash
E2E_DATABASE_URL='postgresql://user:password@127.0.0.1:5432/mini_workout_e2e' DATABASE_URL='postgresql://user:password@127.0.0.1:5432/mini_workout_e2e' pnpm test:e2e
```

To run only the database-backed project:

```bash
E2E_DATABASE_URL='postgresql://user:password@127.0.0.1:5432/mini_workout_e2e' DATABASE_URL='postgresql://user:password@127.0.0.1:5432/mini_workout_e2e' pnpm test:e2e -- --project=db
```

Approved local hosts include `localhost`, `127.0.0.1`, and `[::1]`. The E2E
configuration always starts a fresh Next server, so it cannot reuse a server
started with a different database URL. Public-only startup passes an explicit
whitelist-only environment; inherited database, auth, secret, and unrelated
variables are not passed to the server. Lock, auth-state, and metadata paths
are keyed by a hash of the canonical database URL. Metadata stores only that
derived key and the lock run token; it never stores database credentials.
Teardown reads only metadata for the current approved URL and cleans database
records only after confirming ownership of the canonical lock.

Install the pinned Chromium browser before the first run:

```bash
pnpm --filter @mini-workout/e2e exec playwright install chromium
```

Additional E2E coverage should prioritize user-visible flows such as:

- The web app loads successfully.
- A user can navigate the workout discovery flow.
- A user can view a workout detail page.
- Authentication and protected routes work once that product scope exists.

Theme visual coverage uses fixed `1280x900` dimensions and a named System
snapshot on `/theme-preview`; update it only after visual review with:

```bash
pnpm --filter @mini-workout/e2e test:e2e:update -- --project=public tests/theme.spec.ts -g 'captures the System theme'
```

## Required local checks

```bash
pnpm format
pnpm lint
pnpm check-types
pnpm test
pnpm build
pnpm exec turbo boundaries
pnpm docs:check
```

CI additionally starts disposable PostgreSQL 16, installs Chromium, builds
Storybook, and runs the public and database-backed Playwright projects. CI never
updates snapshots; visual changes must be reviewed and committed locally.

For pull requests, CI runs the equivalent affected task set:

```bash
pnpm exec turbo run build lint check-types test --affected
```

## Coverage and test ownership

Add tests close to the implementation they cover. Keep browser tests in `e2e/`
and component stories in `packages/ui/src/components`. Tests should verify
behavior and public contracts rather than internal implementation details.

## Technical coverage contract

Every new feature should document:

- expected loading, empty, error, and not-found states;
- validation and authorization boundaries;
- network failure and retry behavior;
- logs, error reports, request IDs, and user-safe messages;
- the unit/component/E2E layer that protects the critical behavior.

The web application architecture and error/network conventions are documented
in [`apps/web/docs/ARCHITECTURE.md`](../apps/web/docs/ARCHITECTURE.md). Shared
observability requirements are documented in
[`docs/OBSERVABILITY.md`](OBSERVABILITY.md).
