# Mini Workout

Mini Workout is a Turborepo monorepo for a workout video platform and a modern
Next.js learning project. The repository currently contains the web foundation,
shared UI components, a Tailwind CSS design system, and a Storybook workspace.
The full-stack product roadmap is documented separately in
[`docs/NEXTJS_16_3_WORKOUT_MASTER_PLAN.md`](docs/NEXTJS_16_3_WORKOUT_MASTER_PLAN.md).

## Current status

Implemented today:

- Next.js 16.3 App Router web application in `apps/web`.
- Storybook 10/Vite component workspace in `apps/storybook`.
- Compiled React component library in `packages/ui`.
- Tailwind CSS v4 design system in `packages/design-system`.
- Shared ESLint, Prettier, TypeScript, and Vitest configuration packages.
- Provider-agnostic observability primitives and a web health endpoint.
- Turborepo task orchestration, package boundaries, affected CI checks, and
  optional Vercel remote caching.

The authentication, database, workout domain, and full-stack product features
described in the roadmap are planned work, not current production behavior.

## Requirements

- Node.js `>=20`.
- pnpm `10.30.0` or a compatible pnpm 10 release.

The repository declares its package manager and engine requirements in the root
`package.json`.

## Getting started

```bash
pnpm install
pnpm dev
```

The development command starts the workspace dev tasks through Turborepo.
Open the web app at <http://localhost:3000> and Storybook at
<http://localhost:6006>.

To run one workspace directly:

```bash
pnpm --filter web dev
pnpm --filter @mini-workout/storybook dev
```

## Common commands

| Command                      | Purpose                                                  |
| ---------------------------- | -------------------------------------------------------- |
| `pnpm dev`                   | Start persistent development tasks.                      |
| `pnpm build`                 | Build all packages and applications with Turborepo.      |
| `pnpm build:apps`            | Build only workspaces under `apps/`.                     |
| `pnpm build:packages`        | Build only workspaces under `packages/`.                 |
| `pnpm lint`                  | Run cached lint tasks.                                   |
| `pnpm lint:fix`              | Apply lint fixes.                                        |
| `pnpm format`                | Check Prettier formatting.                               |
| `pnpm format:fix`            | Apply Prettier formatting.                               |
| `pnpm check-types`           | Run workspace TypeScript checks.                         |
| `pnpm test`                  | Run workspace tests.                                     |
| `pnpm test:coverage`         | Run tests with coverage reporting.                       |
| `pnpm exec turbo boundaries` | Check package boundary violations.                       |
| `pnpm docs:check`            | Check local documentation links and stale template text. |

Use Turborepo filters for focused work:

```bash
pnpm exec turbo run build --filter=web
pnpm exec turbo run lint --filter=@mini-workout/ui
pnpm exec turbo run build --filter=web...
pnpm exec turbo run build --affected
```

## Repository structure

```text
apps/
  web/                 Next.js application
  storybook/           Storybook component explorer
packages/
  ui/                  Compiled React component library
  design-system/       Tailwind CSS v4 tokens and themes
  observability/       Shared logging, tracing, health, and metric contracts
  types/               Reserved shared types package
config/
  eslint-config/       Shared ESLint flat configs
  prettier-config/     Shared Prettier config
  typescript-config/   Shared TypeScript configs
  vitest-config/       Shared Vitest configs
docs/                  Architecture, testing, and product roadmap docs
e2e/                   Reserved browser end-to-end test area
```

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for dependency and task
graph details.

## CI and caching

GitHub Actions runs package boundary checks and affected build, lint,
type-check, and test tasks. CI uses the frozen pnpm lockfile and full Git
history so Turborepo can calculate affected workspaces correctly.

Remote caching is enabled when the repository has a `TURBO_TEAM` GitHub
variable and a configured Vercel OIDC policy. Otherwise CI falls back to a
local GitHub Actions cache.

## Documentation

- [`docs/README.md`](docs/README.md) — documentation index.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — repository and build architecture.
- [`docs/TESTING.md`](docs/TESTING.md) — unit, component, and E2E testing guidance.
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — contribution workflow and checks.
- [`SECURITY.md`](SECURITY.md) — vulnerability reporting policy.
- [`docs/NEXTJS_16_3_WORKOUT_MASTER_PLAN.md`](docs/NEXTJS_16_3_WORKOUT_MASTER_PLAN.md) — product and learning roadmap.
