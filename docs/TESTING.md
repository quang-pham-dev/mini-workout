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
that dependency boundary is upgraded deliberately. CI runs Storybook lint/static
checks and the production build; there is no Storybook runtime test runner in
this workspace.

The design-system foundation has focused contract checks:

```bash
pnpm --filter @mini-workout/design-system test
pnpm --filter @mini-workout/design-system check-foundation
```

These cover token registration, Light/Dark parity, shared keyframes, consumer
token references, and global CSS ownership.

### End-to-end tests

The `e2e/` workspace contains the Playwright configuration and runnable browser
checks for public theme behavior and implemented authenticated product journeys.
Use Node 22 selected from `.nvmrc` with `nvm use`. The default suite is
public-only and does not require a database:

```bash
pnpm test:e2e
```

Run the public project explicitly with:

```bash
pnpm --filter @mini-workout/e2e test:e2e -- --project=public
```

The root command builds `apps/web` and its dependencies through Turbo before
Playwright starts production servers. Run
`pnpm exec turbo run build --filter=@mini-workout/web...` before invoking
Playwright directly through a package-local command. Install Chromium once with:

```bash
pnpm --filter @mini-workout/e2e exec playwright install chromium
```

Run DB-free ownership, cleanup, project-discovery, and configuration contracts
with:

```bash
pnpm --filter @mini-workout/e2e test
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
database name must be exactly `e2e`, `test`, `mini_workout_e2e`, or
`mini_workout_test`. Both variables must match exactly. The database must be a
dedicated disposable instance: setup migrates, seeds, resets deterministic
fixture identities, and deletes exact run-owned mutation users. Shared,
developer, staging, and production databases are prohibited.

The configuration starts fresh Next production servers and never reuses an
existing server. `E2E_PUBLIC_PORT` and `E2E_DATABASE_PORT` default to `3000` and
`3001`; values must be distinct base-10 integers in `1024..65535` and must not
be in Chromium's restricted unsafe-port list (`6000`, for example). To coexist
with a development server on port 3000, use for example:

```bash
E2E_PUBLIC_PORT=3100 E2E_DATABASE_PORT=3101 pnpm test:e2e
```

The dynamic ports are used by server environments, health checks, project base
URLs, auth setup, and mutation fixtures. CI leaves them unset, preserving the
defaults.

Public-only startup passes an explicit whitelist-only environment; inherited
database, auth, secret, and unrelated variables are not passed to the server.
The coordinator retains run ownership for setup, tests, and cleanup. Auth state
and metadata are scoped by credential-free database resource key and run token;
metadata is not cleanup authority and stores no credentials. Mutation tests
claim exact run/test/retry-specific emails before browser creation, never mutate
shared read-only fixture accounts, and delete only those exact users. Schema
cascades remove their sessions and workout interactions.

Locks never auto-recover. For a stale lock, stop and verify every coordinator,
worker, consumer, and migration/seed process group for that database has exited.
Only then remove the exact lock path reported by the acquisition error plus that
resource/run's auth directory and metadata file. Never use broad deletion or
recover based only on a dead PID.

Current E2E coverage includes user-visible flows such as:

- Public landing health, pre-hydration theme bootstrap, UI persistence,
  keyboard/system theme behavior, and strict theme/landing visuals.
- Registration validation and duplicates, login, sign-out, onboarding, and
  anonymous/stale/unfinished/completed protected-route behavior.
- Saved and liked workout persistence, count behavior, and per-user isolation.
- Valid populated/empty profile fixtures and authenticated theme behavior.
- Targeted Pixel 7 theme, navigation dialog focus/trap/Escape/scroll-lock,
  profile appearance persistence, and responsive-overflow behavior.

Profile preference editing, a product-specific root entry page, video playback,
and workout completion remain product follow-ups and are not covered as if they
were implemented. E2E policy tests are contract coverage, not instrumented code
coverage; use `pnpm test:coverage` for current application/package code coverage.

Playwright 1.62.1 supports `reducedMotion` as a browser context option (including
`use.contextOptions`) but not as a first-class Playwright Test fixture option.
Tests that need per-page emulation use `page.emulateMedia`.

Theme visual coverage uses the production server and named snapshots on
`/theme-preview` and the public landing page. The System-theme snapshot sets a
`1280x900` viewport; landing snapshots use Desktop Chrome's default `1280x720`.
The canonical renderer is lockfile-pinned Playwright Chromium on
`ubuntu-24.04`. Visual comparisons use strict defaults with no suite-wide
differing-pixel allowance. CI sets snapshot updates to `none`; local runs use
`missing`, which creates absent platform-specific baselines without replacing
existing images.

The configured snapshot template is
`__screenshots__/{platform}/{projectName}/{testFilePath}/{arg}{ext}`. Approved CI
images are stored under
`e2e/__screenshots__/linux/public/tests/public/theme.spec.ts/`, while macOS output
uses a separate platform path. To intentionally replace a reviewed baseline, run
the following command in the canonical Ubuntu 24.04 environment:

```bash
pnpm --filter @mini-workout/e2e test:e2e:update -- --project=public tests/public/theme.spec.ts -g 'captures the System theme'
```

Run the same public visual selection without `--update-snapshots` before
approving the changed image.

Do not update snapshots on macOS to satisfy Linux CI. macOS uses separate
platform paths; canonical approval requires Ubuntu 24.04 with the pinned
Chromium, followed by the same visual selection without snapshot updates.

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
Failed-run artifacts are limited to `e2e/playwright-report/` and
`e2e/test-results/` with seven-day retention. `.auth` storage state is excluded,
and DB project traces are disabled to keep auth bodies and cookies out of
artifacts. Never commit sensitive local traces or storage state.

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
