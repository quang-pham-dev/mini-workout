# `@mini-workout/observability`

Provider-agnostic observability primitives for Mini Workout applications.

This package provides shared abstractions and contracts for logging, tracing, health checks, web vitals, error handling, and alerting. By keeping these primitives provider-agnostic, we ensure that consuming applications are not tightly coupled to specific telemetry vendors (e.g., Datadog, Sentry, Vercel Analytics) while sharing consistent observability patterns across the monorepo.

## Primitives

The current observability primitives include:

- **Alerting** (`alerting.ts`)
- **Errors** (`errors.ts`)
- **Health** (`health.ts`)
- **Logger** (`logger.ts`)
- **Tracing** (`tracing.ts`)
- **Web Vitals** (`web-vitals.ts`)

All primitives are implemented in `src/` and exported from the main entrypoint.

## Installation and usage

Inside another workspace, declare the dependency:

```json
{
  "dependencies": {
    "@mini-workout/observability": "workspace:*"
  }
}
```

Import the main entrypoint to use the observability primitives:

```ts
import { logger } from '@mini-workout/observability';

logger.info('Application started');
```

## Development

```bash
pnpm --filter @mini-workout/observability build
pnpm --filter @mini-workout/observability lint
pnpm --filter @mini-workout/observability check-types
pnpm --filter @mini-workout/observability test
pnpm --filter @mini-workout/observability test:coverage
```

The package is compiled by tsup into `dist/`.

## Adding a primitive

1. Create a new module file under `src/`.
2. Add the implementation and ensure it remains provider-agnostic.
3. Export the primitive from `src/index.ts`.
4. Add unit tests for non-trivial behavior in the `tests/` directory.
5. Update this README if the public API changes.
