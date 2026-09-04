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

### End-to-end tests

The `e2e/` workspace contains the Playwright configuration and a runnable
browser check for the public landing page. The default suite is public-only and
does not require a database:

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
sanitized environment and blocks inherited database and auth settings. Lock,
auth-state, and metadata paths are keyed by a hash of the canonical database
URL. Metadata stores only that derived key and the lock run token; it never
stores database credentials. Teardown reads only metadata for the current
approved URL.

Install the pinned Chromium browser before the first run:

```bash
pnpm --filter @mini-workout/e2e exec playwright install chromium
```

Additional E2E coverage should prioritize user-visible flows such as:

- The web app loads successfully.
- A user can navigate the workout discovery flow.
- A user can view a workout detail page.
- Authentication and protected routes work once that product scope exists.

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
