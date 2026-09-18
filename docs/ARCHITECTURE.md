# Architecture

## Repository shape

Mini Workout is a pnpm workspace managed by Turborepo.

```text
apps/
  web/                 Deployable Next.js 16.3 application
  admin/               Deployable TanStack Start admin application
  storybook/           Storybook 10/Vite component explorer
packages/
  core/                Framework-agnostic, database-backed application core
  database/            Prisma client and persistence types
  auth/                Authentication and authorization services
  ui/                  Compiled React component library
  design-system/       Shared semantic contracts plus web token/theme adapters
  observability/       Provider-agnostic telemetry contracts and adapters
config/
  eslint-config/       Shared ESLint flat configurations
  prettier-config/     Shared Prettier configuration
  typescript-config/   Shared TypeScript configurations
  vitest-config/       Shared Vitest configurations
```

Applications are deployable endpoints. Packages and config packages are
consumed by applications or other packages and must not depend on an app.

## Dependency direction

The current dependency flow is:

```text
apps/web ───────────────┐
                        ├──> packages/ui ──> packages/design-system
                        ├──> packages/observability
                        └──> config packages
apps/storybook ───────────> packages/ui ──> packages/design-system
apps/admin ───────> packages/auth, packages/core, packages/database,
                    packages/observability, packages/ui, packages/design-system
```

Applications may consume packages, while packages must not depend on apps.
The UI package exposes compiled JavaScript and TypeScript declarations through
its package exports. The design system owns shared semantic vocabulary and the
web CSS adapter; it does not contain UI renderers.

The design system is intentionally not a cross-platform component framework.
`@mini-workout/ui` remains the web renderer. The design-system package owns the
shared vocabulary that a future `@mini-workout/ui-native` renderer can consume:

- semantic token names such as `background`, `surface`, `text-primary`, and
  `primary`;
- component names and variants such as `button.default` and `button.outline`;
- accessibility expectations for each shared component.

The current CSS files are the web adapter for those semantics. React Native
implementation is deliberately deferred until a mobile application exists.

`@mini-workout/core` is deliberately a database-backed application core for
the current product. It owns repositories, services, domain schemas, stable
DTOs, and domain errors, and may depend on `@mini-workout/database`. It must
remain independent of Next.js, TanStack Start, React, HTTP, cookies, and
observability adapters. A separate pure domain kernel is not required unless a
real runtime or deployment boundary makes that separation valuable.

## Public package APIs

### `@mini-workout/ui`

- `@mini-workout/ui` — public component barrel.
- `@mini-workout/ui/button` — compiled Button entrypoint.
- `@mini-workout/design-system/globals` — shared Tailwind foundation and UI styles.

The package is compiled by tsup into `dist/`. Add a new public entrypoint to
both `packages/ui/tsup.config.ts` and `packages/ui/package.json` exports.

### `@mini-workout/design-system`

- Root/global CSS.
- Design tokens.
- Light and dark theme CSS.
- PostCSS configuration.
- `@mini-workout/design-system/tokens` — semantic token names and token types.
- `@mini-workout/design-system/contracts` — shared component vocabulary and
  accessibility expectations.

Import the global stylesheet once per web application. Keep token changes
synchronized between light and dark themes, and update the shared semantic
token/contract foundation when the public vocabulary changes.

### Configuration packages

Configuration packages expose files directly and do not need JavaScript build
tasks. Consumers should use their documented package exports rather than
reaching into package source paths.

## Type and contract ownership

Follow these ownership rules when adding or changing TypeScript types:

- `@mini-workout/core` owns domain input schemas, business DTOs, service-facing
  contracts, and domain errors. Apps must import these through public exports
  instead of redefining domain shapes.
- `@mini-workout/database` owns Prisma Client, generated model/enums, and
  persistence-only types. Prisma types must not be exposed as public API DTOs.
- `@mini-workout/auth` owns authentication and authorization contracts.
- `@mini-workout/observability` owns logging, error-reporting, tracing, and
  telemetry contracts.
- Onboarding status and step contracts belong to `@mini-workout/core`; Prisma
  generated enums remain persistence-owned in `@mini-workout/database` unless
  they are intentionally promoted into a domain contract.
- `@mini-workout/ui` and `@mini-workout/design-system` own component props,
  tokens, variants, and accessibility contracts; these are separate from
  business/domain contracts.
- `apps/*` own route parameters, serialized transport views, page/form state,
  and app-only orchestration types. Date/string serialization belongs at this
  boundary.
- A new shared package requires at least two independent consumers and a clear
  boundary. Do not create a generic `types` package for convenience.

### Future cross-runtime contracts

If the system later adds a mobile app, worker, public API client, or another
independent runtime that must share request/response contracts, create
`@mini-workout/contracts`. Keep it focused by domain, use Zod schemas as the
runtime source of truth, and derive TypeScript types with `z.infer`. Do not move
internal Prisma models or app-only view models into that package.

## Turborepo task model

- `build` runs dependency builds only where a compiled dependency is required.
- `transit` carries dependency-aware hashing for parallel lint and type checks.
- `lint` and `check-types` are cached package tasks.
- `test` is package-defined and only exists where a package has tests.
- `dev` and `start` are persistent and never cached.
- Framework-specific output paths are configured in package-level `turbo.json`
  files.

Run the graph and boundary checks with:

```bash
pnpm exec turbo run build lint check-types test --dry=json
pnpm exec turbo boundaries
```

## Environment and caching

Turborepo uses strict environment mode. Build-sensitive variables belong in the
task that consumes them. CI passes `CI` through without using it as a build
hash input.

Local cache output is `.turbo/`. Never run repository tooling as `root`; root-owned
cache files cause later `Permission denied` errors when Turborepo replays logs.

CI uses full Git history for `--affected` and can use Vercel remote caching when
`TURBO_TEAM` and the OIDC policy are configured.

## Boundary rules

Every workspace dependency must be declared in the consuming package's
`package.json`. Imports must use package exports, not paths such as
`../../packages/ui/src/...`.

The boundary check is part of CI:

```bash
pnpm exec turbo boundaries
```

### Application feature boundaries

`apps/web` uses independent vertical feature slices. A feature may import
shared lower layers (`src/lib`, `src/components`, `src/hooks`, `src/types`) and
workspace packages, but it must not import another feature. Routes compose
features through their public entrypoints only; shared components must not
import feature actions or queries.

This rule is enforced by `eslint-plugin-boundaries` in
`apps/web/eslint.config.js`. The element patterns must match the real source
layout: `src/app/**`, `src/features/*/**`, `src/components/**`, `src/lib/**`,
and `src/types/**`. Any boundary change must include a negative lint check (or
fixture) proving that invalid feature-to-feature and internal-entry imports
fail. A passing lint run is not sufficient if the boundary classifier does not
recognize the source path.

Shared behavior used by multiple features moves down to the lowest appropriate
layer. Do not hide a forbidden dependency behind a re-export. Promote code to a
workspace package only when it has a real consumer outside the app.

### Admin application boundaries

`apps/admin` uses TanStack Start/Router/Query and follows a different
composition layout from `apps/web`, but the same dependency principle applies:
routes compose capabilities; features own use cases; libs own framework and
infrastructure adapters. Routes must not import sibling routes or feature
internals. The public admin feature API is
`apps/admin/src/features/admin/index.ts`.

The admin boundary is enforced by `eslint-plugin-boundaries` in
`apps/admin/eslint.config.js`:

- `routes` may import `components`, `libs`, and `features/*/index.ts`.
- `features` may import their own internals, `libs`, and workspace packages;
  they must not import routes or UI components.
- `components` may import components/libs, never routes or features.
- `libs` may import libs only.

This prevents route-to-route reuse, accidental coupling to a feature's private
implementation, and UI code depending on server-function internals. The full
admin convention is documented in
[`apps/admin/docs/ARCHITECTURE.md`](../apps/admin/docs/ARCHITECTURE.md).

### Singleton and dependency-injection boundaries

Each runtime infrastructure dependency has one owning entrypoint and one
instance per adapter/runtime:

- `@mini-workout/database` owns the guarded Prisma singleton.
- `@mini-workout/observability` owns one lifecycle-managed instance per service
  runtime. Initialize it from the app instrumentation entrypoint and consume
  it through `getObservability()`; route modules must not create logger
  instances at module scope.
- `@mini-workout/auth` owns the Web and TanStack Start Better Auth instances.
  These are intentionally two isolated instances because their framework cookie
  adapters differ; Web and Admin are separate runtime boundaries.
- App features, routes, and components must consume these exported instances,
  never construct their own Prisma/Auth clients.

Singleton changes must preserve the `globalThis` development/HMR guard where
applicable, use a namespaced global key, and include a module-reload test. This
prevents accidental duplicate DI providers and connection pools.

Framework runtime scope is part of the singleton rule. Server auth/Prisma
instances are process/module singletons, browser auth clients are one client
per browser runtime, and TanStack Query clients are request/router scoped for
SSR isolation. Never globalize a request-scoped cache or request context merely
to reduce allocations.

### Health endpoint boundaries

- `apps/web/src/app/api/health/live/route.ts` is liveness only. It must not
  perform database or other dependency I/O and returns HTTP 200 when it runs.
- `apps/web/src/app/api/health/ready/route.ts` is readiness and the only Web
  source file allowed to import `@mini-workout/database`. It calls only the
  package-owned `pingDatabase()` probe; failure returns HTTP 503.
- `/api/health` remains a compatibility alias for readiness while monitors
  migrate to the explicit live/ready endpoints.
- Health routes use the shared observability lifecycle and never construct a
  second logger or infrastructure singleton at module scope.

## Priority decisions

### Implemented now

- Web apps consume the shared UI/design-system CSS entrypoint.
- `@mini-workout/ui/data-table` is an explicit heavy-component entrypoint;
  DataTable is not part of the main barrel.
- React is a peer dependency of the reusable UI package.
- CI permissions and the pre-commit command follow least-privilege and pnpm
  workspace conventions.
- `@mini-workout/observability` provides provider-agnostic logging, errors,
  tracing, Web Vitals, health, and alert contracts.

### Deferred by design

- Replacing the starter homepage is deferred until product UI work begins.
- Full authentication, database, network clients, and domain packages are
  introduced with the corresponding business feature.
- Unit, component, and E2E coverage grow with each feature; the test contract is
  documented in `docs/TESTING.md`.
- Vendor-specific observability integrations are deferred until deployment and
  privacy requirements select a provider.

Each deployable app and major package keeps a local `docs/ARCHITECTURE.md` with
its conventions and integration rules.
