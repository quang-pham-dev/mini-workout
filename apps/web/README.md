# Web application

The `web` workspace is the deployable Next.js 16.3 App Router application for
Mini Workout.

## Development

From the repository root:

```bash
pnpm --filter web dev
```

Open <http://localhost:3000>.

The application uses local Geist fonts from `app/fonts` and consumes the shared
UI package through its public exports.

Authentication currently uses Better Auth email/password authentication with
database-backed sessions through Prisma. Copy `.env.example` to `.env.local`,
provide `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, and `DATABASE_URL`, then
generate the Prisma client:

```bash
cp apps/web/.env.example apps/web/.env.local
pnpm --filter web db:generate
```

The Better Auth CLI can regenerate the auth portion of the Prisma schema when
the auth configuration or plugins change:

```bash
pnpm --filter web auth:generate
```

Apply the first local migration once a PostgreSQL database is available:

```bash
pnpm --filter web db:migrate --name init
```

Its route, data, error, network, security, testing, and observability
conventions are documented in
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Commands

```bash
pnpm --filter web lint
pnpm --filter web check-types
pnpm --filter web test
pnpm --filter web build
pnpm --filter web start
```

The root scripts run these tasks through Turborepo and should be preferred when
validating the whole repository.

## Application structure

- `app/layout.tsx` — root layout, local fonts, and metadata.
- `app/page.tsx` — current landing page.
- `app/globals.css` — application-level global styles.
- `public/` — static assets.

Current authentication routes are `/login`, `/register`, `/home`, and
`/api/auth/[...all]`. Unauthenticated access to protected routes is redirected
to `/login`. Workout domain routes, onboarding, database seed data, and browser
E2E coverage remain planned work.
