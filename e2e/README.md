# End-to-end testing

The `e2e/` workspace contains Playwright browser tests and database-fixture
contracts that exercise Mini Workout through user-visible workflows.

## Runtime

Node.js 22 is the supported runtime for this package. Use `nvm use` at the
repository root to select the version pinned in `.nvmrc` (currently v22.20.0).
The shared CI prepare action also reads `.nvmrc`, keeping CI on the same runtime.

Both the root and E2E packages require Node `>=22.6.0` because the policy runner
uses `--experimental-strip-types` and participates in the root `pnpm test` task.

## Commands and prerequisites

Browser tests run against production builds of `apps/web` and, when a disposable
database is configured, `apps/admin`. The root `test:e2e` Turbo task builds both
apps and their package dependencies first. Before a
package-local Playwright command, build explicitly:

```bash
pnpm exec turbo run build --filter=@mini-workout/web...
```

Playwright 1.62.1 accepts `reducedMotion` in `BrowserContextOptions`, including
through `use.contextOptions`, but does not expose it as a first-class Playwright
Test fixture option. Tests that need a per-page value use
`page.emulateMedia({ reducedMotion: ... })`.

Run the default public-only suite without a database:

```bash
pnpm test:e2e
```

To select the public project explicitly, run:

```bash
pnpm --filter @mini-workout/e2e test:e2e -- --project=public
```

Run the fixture and safety policy tests without an app or database:

```bash
pnpm --filter @mini-workout/e2e test
```

The `test` script delegates to `test:policy` and participates in the root Turbo
`test` task. CI also runs it explicitly before the browser and visual gates,
independently of affected-package selection.

Install the lockfile-pinned Chromium browser before the first browser run:

```bash
pnpm --filter @mini-workout/e2e exec playwright install chromium
```

Run the database-backed fixtures with an explicitly disposable local database:

```bash
E2E_DATABASE_URL='postgresql://user:password@127.0.0.1:5432/mini_workout_e2e' DATABASE_URL='postgresql://user:password@127.0.0.1:5432/mini_workout_e2e' pnpm test:e2e -- --project=db
```

Both `E2E_DATABASE_URL` and `DATABASE_URL` are required for database-backed E2E
runs and must be identical. The selected URL must use the PostgreSQL protocol,
resolve to `localhost`, `127.0.0.1`, or `[::1]`, and use exactly one of these
database names: `e2e`, `test`, `mini_workout_e2e`, or `mini_workout_test`.
Production hosts and names that merely contain `test` or `e2e` are rejected.
The database must be disposable and dedicated to the E2E run because migration,
seed, deterministic fixture reset, and exact mutation-user deletion all write to
it. Never point either variable at a developer, shared, staging, or production
database. The canonical URL is propagated to Prisma migrate, seed, fixture
setup, and the Next web server.

Public-only startup receives an explicit whitelist-only environment. Its
`DATABASE_URL` is the unreachable
`postgresql://invalid:invalid@127.0.0.1:1/mini_workout_public_test` sentinel and
`E2E_DATABASE_URL` is explicitly empty, so Next cannot backfill either value
from an application env file. Inherited database, auth, secret, and unrelated
variables are not passed to the server. The database-backed server validates
the disposable URL and explicitly supplies that same URL through both database
variables.

The E2E servers use the production web build, always start fresh, and never
reuse already-running Next servers. `E2E_PUBLIC_PORT` and `E2E_DATABASE_PORT`
default to `3000` and `3001`. Each value must be a base-10 integer from `1024`
through `65535`, without signs, decimals, leading zeroes, or whitespace, and the
two ports must differ. Chromium-restricted unsafe ports, including `6000`, are
also rejected so a server cannot start on a URL the test browser refuses to
load. Override both when a local development server occupies a default port:

```bash
E2E_PUBLIC_PORT=3100 E2E_DATABASE_PORT=3101 E2E_ADMIN_PORT=3102 pnpm test:e2e
```

The three ports default to `3000`, `3001`, and `3002` and must be distinct. The
selected ports drive Playwright base URLs, health checks, app `PORT` and
`BETTER_AUTH_URL`, auth setup origins, and mutation-user browser contexts. CI
does not set these variables and therefore retains the `3000`/`3001` defaults.

The global-setup coordinator owns the database lock for the entire run. The
`db-setup` project requests ownership through an authenticated loopback handshake,
then requests coordinator-owned migration and seed commands before performing
API auth preparation in the worker. Public selection never
requests ownership or cleans fixtures, even with both database variables set.
The configured web servers still depend on the environment; use no database
variables when only the public server is wanted. Explicit `--project=db` with
missing or partial database configuration fails with a missing-project error,
instead of falling back to public tests.

Playwright 1.62.1 passes all configured projects in `FullConfig` to global setup,
not the CLI-selected subset. The handshake avoids relying on that list or PID
parent heuristics. DB-free orchestration contracts exercise actual Playwright
setup-worker exit, dependent-worker environment propagation, public selection,
and automatic finalization after partial auth failures.

The resource key is a SHA-256 hash of the validated local endpoint, normalized
port (default `5432`), and decoded database name. Credentials and query tuning
are excluded; query overrides of host, port, or database are rejected. All
permitted loopback aliases conservatively share a resource
key, even where IPv4 and IPv6 happen to serve different local instances.
Auth state lives only at `.auth/<resource-key>/<run-token>/`; there is no legacy
path fallback. Run-scoped `.auth/<resource-key>/<run-token>.json` metadata
contains only the key and token, and is never used to discover cleanup authority.
It sits beside the run's auth directory so auth removal cannot remove metadata
ahead of its ordered cleanup step.

The coordinator finalizer retains its own token in a closure and checks ownership
before each action: auth removal, scoped fixture-user DB cleanup, owned metadata
removal, then release. Every cleanup is attempted while owned, preserving the
first cleanup error. Failed setup is finalized automatically, including partial
signup/sign-in/storage-state failures; setup errors are not replaced by cleanup
or API disposal errors. Setup retries are disabled to avoid repeating partial
mutations under the same claim.

The active and empty fixture users are completed onboarding profiles with valid
experience levels and interests. The active profile is intermediate with
Strength and HIIT interests and retains its saved/liked workout. The empty
profile is a beginner with Mobility selected and intentionally has no saved or
liked workouts. The new-user fixture remains unfinished.

Migration and seed run only through the coordinator's authenticated `/prepare`
endpoint, which requires its own run token and accepts no command text from the
worker. Each command has a dedicated POSIX process group and a 120-second runtime
limit. On worker disconnect, cancellation, timeout, or finalization, the coordinator
sends SIGTERM to the group, escalates to SIGKILL after 500 ms, and allows at most
five seconds to prove both direct-child exit/reaping and process-group absence.
The next command cannot start until that proof succeeds. The finalizer applies
the same proof gate before **any** artifact/DB cleanup or lock release. Unknown
process status or unsuccessful termination retains the lock and artifacts for
manual recovery, even if the setup worker is already dead.

Managed commands currently support POSIX (macOS/Linux) only. Commands must not
daemonize or escape their process group; the configured pnpm migration/seed
commands are foreground jobs. Windows is rejected rather than using an unsafe
direct-child-only fallback. Setup allows five minutes overall for both bounded
commands and auth preparation.

Locks are fail-closed: dead, incomplete, malformed, and inaccessible claims are
never automatically taken over, and tokenless release is a no-op. If a coordinator
is forcibly killed, first stop and verify **all** coordinators, setup workers,
consumers, and migration/seed command process groups for that database have
exited. A dead coordinator or setup worker does not prove its writers stopped.
Only then manually remove the exact
lock path printed in the acquisition error and that resource's `.auth` directory
and run-scoped metadata file. Do not glob across resources or runs. Retry setup
to reset the scoped fixture users. Never perform this recovery while another run
might be active; PID death alone is insufficient.

The DB-free orchestration contracts use a temporary auth root and production
auth/metadata removal, mocking only DB cleanup. They check metadata still exists
at the DB-cleanup boundary and is gone while the lock is still held immediately
before release. Actual Playwright CLI runs cover graceful SIGINT during setup and
dependent consumers, metadata/API-creation failures before auth preparation, and
SIGKILL leaving artifacts and the lock intact. Child process groups have bounded
shutdown and worker-exit checks; forced-kill test artifacts are removed only after
the child processes have stopped.
An additional regression kills only the setup worker while a harmless command
and its descendant are running, leaving the coordinator alive. Cleanup observes
both command PIDs dead before DB cleanup/release. A simulated unverifiable process
group verifies that no artifacts or lock are removed without termination proof.

CI runs all configured Chromium projects against a disposable PostgreSQL 16
service using the approved `mini_workout_e2e` database name. The canonical
visual renderer is Chromium supplied by the lockfile-pinned Playwright 1.62.1
toolchain on `ubuntu-24.04`; CI installs Chromium only and sets snapshot updates
to `none`. Local runs use `missing`, so a missing baseline can be created for
review without replacing an existing one.

The Playwright configuration retains platform/project snapshot paths for future
reviewed visual suites. Current public theme checks are behavioral rather than
visual snapshots and run against the `/login` auth entry route. The old
`/theme-preview` route and landing screenshot claims are not part of the
implemented suite.

The `public-mobile` and `db-mobile` projects use Playwright's Pixel 7 Chromium
device profile. They discover only `theme-mobile.spec.ts` and
`navigation-mobile.spec.ts`, respectively; desktop projects exclude those files.
`db-mobile` depends on `db-setup`, so its authenticated state uses the same
coordinator ownership handshake while avoiding a second run of mutation-heavy
DB specs. Mobile checks are behavioral rather than visual: they cover public
theme-control overflow/usability, document overflow on authenticated routes, the
implemented navigation dialog's initial focus, focus trap, Escape behavior and
scroll-lock cleanup, and the profile appearance selector with reload persistence.

On failure, CI uploads only `e2e/playwright-report/` and `e2e/test-results/` for
seven days. The run-scoped `e2e/.auth/` directory is ignored and is not included
in the artifact paths. DB projects disable traces because request bodies and
cookies contain authentication material. Do not commit local reports, traces,
screenshots-on-failure, storage states, or any artifact that contains credentials
or session data.

## Implemented coverage

Current public desktop coverage includes the auth entry health check, theme
defaults, UI-selected persistence across reload, pre-hydration theme bootstrap,
keyboard/system theme behavior, and route contracts. The focused public mobile
project covers the `/login` entry route and horizontal overflow.

Current database-backed desktop coverage includes deterministic populated and
empty fixtures, registration validation and duplicate handling, login and
sign-out persistence, onboarding validation and persisted recommendations,
anonymous/stale/unfinished/completed route guards, save/unsave and like/unlike
persistence, two-user interaction isolation, stored profile preferences, and
authenticated theme keyboard behavior. The focused database mobile project
covers navigation focus/trapping/Escape/scroll lock, overflow, and profile theme
persistence. Critical mutation journeys are tagged `@critical`.

The `admin` and `admin-mobile` projects reuse the coordinator-owned disposable
database. They cover own-origin ADMIN login/session/logout, current-role
revalidation (including downgrade), MEMBER denial, direct/client/history
navigation, cursor URL persistence, security headers, keyboard focus, and
responsive overflow at 375, 768, 1024, and 1440 pixels. Admin parity stays
read-only except for fixture user/session creation and controlled role changes.

The Node policy suite covers disposable URL validation, run-scoped ownership,
bounded process shutdown, partial setup cleanup, auth/metadata isolation,
project discovery/configuration, port validation, and exact mutation-user
cleanup. It is a contract suite, not browser or application code coverage.
Application code coverage is collected separately with `pnpm test:coverage`.

## Product follow-ups

- Profile **Edit** currently links to `/onboarding`, whose completed-user guard
  redirects back to `/home`; a real preference-editing flow requires a product
  decision and regression tests.
- `/` remains the approved starter entry page. Replacing it with a product
  landing or authenticated entry experience requires product/design approval
  and reviewed visual baselines.
- Video playback and workout completion are not implemented and therefore are
  not claimed by this suite.

These are product follow-ups, not reasons to change application behavior or
approve new snapshots during E2E maintenance.

## Structure

The current infrastructure uses:

```text
e2e/
  playwright.config.ts
  coordinator.setup.ts
  global.setup.ts
  fixtures/
    database.ts
    database-env.ts
    database-policy.test.ts
    test.ts
  tests/
    public/
      infrastructure.spec.ts
      theme.spec.ts
      theme-mobile.spec.ts
    db/
      category-discovery.spec.ts
      fixtures.spec.ts
      auth.spec.ts
      authenticated-theme.spec.ts
      onboarding.spec.ts
      navigation-mobile.spec.ts
      route-guards.spec.ts
      workout-interactions.spec.ts
      workout-search.spec.ts
```

Tests should describe user behavior, use accessible selectors, remain
independent, and avoid duplicating unit or component-test coverage.

## Workflow

The Playwright configuration starts the web app, runs the browser suite, and
publishes an HTML report and traces on failure. The root `test:e2e` script
delegates to this workspace package through Turbo.
