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

Its route, data, error, network, security, testing, and observability
conventions are documented in
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Commands

```bash
pnpm --filter web lint
pnpm --filter web check-types
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

Product routes, authentication, database access, and workout domain features
are planned in the master roadmap and are not implemented yet.
