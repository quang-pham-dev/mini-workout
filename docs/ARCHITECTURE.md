# Architecture

## Repository shape

Mini Workout is a pnpm workspace managed by Turborepo.

```text
apps/
  web/                 Deployable Next.js 16.3 application
  storybook/           Storybook 10/Vite component explorer
packages/
  ui/                  Compiled React component library
  design-system/       Shared semantic contracts plus web token/theme adapters
  types/               Reserved shared type package
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
```

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
