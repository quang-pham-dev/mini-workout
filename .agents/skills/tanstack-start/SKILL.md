---
name: tanstack-start
description: >
  Guidance for apps/admin — TanStack Start server functions, TanStack Router
  file-based routing, TanStack Query SSR isolation, and the Nitro adapter
  context. Use whenever touching routes, loaders, server functions, or SSR
  data patterns in apps/admin.
risk: low
source: project
date_added: "2026-09-20"
---

# TanStack Start (apps/admin)

Use this skill for all work inside `apps/admin`. The admin app runs on
**TanStack Start** (Vite + Nitro) with **TanStack Router** and **TanStack
Query**. It is a separate runtime boundary from `apps/web` and must not share
Next.js patterns.

---

## When to Use

- Adding or editing routes inside `apps/admin/src/routes/`
- Implementing server functions or data loaders in the admin app
- Wiring TanStack Query for server-side data or mutations in admin
- Debugging SSR isolation or Nitro adapter issues
- Creating features inside `apps/admin/src/features/`

---

## Project layout

```
apps/admin/
  src/
    routes/           # File-based routes (TanStack Router)
      __root.tsx      # Root layout + TanStack Query provider
      index.tsx       # Dashboard root
      _authed/        # Auth-guarded subtree
    features/
      admin/          # Public feature API: features/admin/index.ts
        components/
        hooks/
        server/       # Server functions scoped to admin feature
    components/       # Shared admin UI (no feature imports)
    libs/             # Framework adapters, clients, infra
  tsr.config.json     # TanStack Router code-gen config
  vite.config.ts
```

**Boundary rules (enforced by eslint-plugin-boundaries):**
- `routes` may import `components`, `libs`, `features/*/index.ts`
- `features` may import own internals, `libs`, workspace packages; must **not** import routes or UI components
- `components` may import `components`, `libs`; never routes or features
- `libs` may import `libs` only

See `apps/admin/docs/ARCHITECTURE.md` for the full convention.

---

## Route files

```ts
// apps/admin/src/routes/workouts/index.tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/workouts/')({
  component: WorkoutsPage,
  loader: async ({ context }) => {
    // loaders run on server during SSR; return serialisable data
    return await context.queryClient.ensureQueryData(workoutsQueryOptions())
  },
})
```

Key rules:
- Route files own the URL shape and compose features through their public index
- Loaders receive `{ context }` — TanStack Query `queryClient` is on context
- Never import sibling routes from a route file

---

## Server functions

```ts
// apps/admin/src/features/admin/server/workouts.ts
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

const UpdateWorkoutInput = z.object({ id: z.string(), title: z.string() })

export const updateWorkout = createServerFn({ method: 'POST' })
  .validator(UpdateWorkoutInput)
  .handler(async ({ data }) => {
    // runs on the Nitro server; can use workspace packages
    // MUST follow docs/ERROR_HANDLING_CONVENTION.md
    return await workoutService.update(data)
  })
```

Key rules:
- Server functions are the admin app mutation boundary (analogous to Next.js Server Actions)
- Always validate with Zod at the server function boundary
- Follow `docs/ERROR_HANDLING_CONVENTION.md` for error classification and reporting
- Do not call server functions from other server functions; compose at the service layer in `packages/core`

---

## TanStack Query — SSR isolation

```ts
// apps/admin/src/routes/__root.tsx
import { createRootRouteWithContext } from '@tanstack/react-router'
import { QueryClient } from '@tanstack/react-query'

interface RouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
})
```

Key rules:
- Create one `QueryClient` **per request** during SSR; never use a module-level singleton
- Prefer `ensureQueryData` in loaders to populate the cache before render
- Mutations invalidate queries via `queryClient.invalidateQueries`
- TanStack Query clients are request/router scoped for SSR isolation (see ARCHITECTURE.md singleton rules)

---

## Auth (Better Auth in TanStack Start context)

Auth in admin uses a **separate** Better Auth instance from `apps/web`. Both
instances are isolated because their framework cookie adapters differ.

```ts
import { auth } from '@mini-workout/auth/tanstack-start'

// Inside a server function handler:
const session = await auth.api.getSession({ headers: request.headers })
if (!session?.user) {
  // Classify and report via ERROR_HANDLING_CONVENTION
}
```

See the `better-auth` skill for full auth guidance.

---

## Code generation

TanStack Router generates route types from the file tree. Always run after
adding or renaming routes:

```bash
pnpm --filter @mini-workout/admin generate-routes
# check-types runs tsr generate automatically:
pnpm --filter @mini-workout/admin check-types
```

`tsr.config.json` controls output paths. Never manually edit generated route files.

---

## Verification commands

```bash
# Type-check (also generates route types)
pnpm --filter @mini-workout/admin check-types

# Lint
pnpm --filter @mini-workout/admin lint

# Unit tests
pnpm --filter @mini-workout/admin test

# Build (Nitro SSR bundle)
pnpm --filter @mini-workout/admin build

# Boundary check
pnpm exec turbo boundaries
```

---

## Stop conditions

Pause and ask if:
- A new external npm dependency is needed for the admin app
- A server function needs to access secrets not already in `apps/admin/.env.example`
- A route change requires a new auth role or permission not yet defined

---

## Limitations

- Do not use Next.js patterns (`'use server'`, `'server-only'`, `next/*`) in `apps/admin`
- Do not share a TanStack Query `queryClient` instance across SSR requests
- Do not import `apps/web` internals from `apps/admin`
- Do not fabricate route type files; always run `tsr generate` after route changes
