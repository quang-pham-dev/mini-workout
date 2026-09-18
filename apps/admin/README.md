# Mini Workout Admin

The admin dashboard is a TanStack Start application. It owns its login flow and
uses shared authorization and business services from `packages/auth` and
`packages/core`; database access remains inside `packages/database`.

## Local development

Copy `.env.example` to `.env` and provide `DATABASE_URL`,
`BETTER_AUTH_SECRET`, `BETTER_AUTH_URL=http://localhost:3001`, and
`BETTER_AUTH_TRUSTED_ORIGINS=http://localhost:3001`.

```bash
pnpm --filter @mini-workout/admin dev
```

The application runs on <http://localhost:3001>. Only users whose current
database role is `ADMIN` can access `/workouts` and `/coaches`.

## Verification

```bash
pnpm --filter @mini-workout/admin check-types
pnpm --filter @mini-workout/admin lint
pnpm --filter @mini-workout/admin test:coverage
pnpm --filter @mini-workout/admin build
pnpm --filter @mini-workout/admin check-artifact
```

The Nitro production artifact is written to `.output/`. Vercel configuration
is declared in `vercel.json`.

## Architecture notes

- App-specific ownership and dependency rules are documented in
  [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md); repository-wide rules are in
  [`../../docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md).
- Router loaders prefill a request-scoped TanStack Query cache.
- Every admin server function independently validates the Better Auth session
  and delegates current-role authorization to `packages/core`.
- Cursor state is validated and stored in the URL.
- The shared Table v9 component uses external pagination for admin lists.
- TanStack Start streaming currently emits inline hydration scripts. The CSP
  therefore permits inline scripts while retaining same-origin, anti-framing,
  MIME-sniffing, and no-store protections. Replace this allowance with nonces
  when the framework exposes end-to-end nonce support. Admin Platform owns this
  exception and reviews it by 15 December 2026, or earlier when nonce support
  lands. Removal requires all streamed scripts to use nonces and the header E2E
  suite to pass without the inline allowance.

## Deployment gate and rollback

CI builds the Nitro artifact on Ubuntu, verifies the traced Prisma client/native
engine, and runs ADMIN/MEMBER journeys against PostgreSQL 16. Before switching
a production domain, deploy a Vercel Preview with non-production credentials,
run the same RBAC/header suite, and retain the prior immutable deployment.
Rollback succeeds only when the domain points back to that deployment and
login, MEMBER denial, ADMIN lists, and response headers pass. Observe the new
deployment for seven days before retiring the rollback target.
