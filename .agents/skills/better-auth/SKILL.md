---
name: better-auth
description: >
  Authentication and authorization guidance for mini-workout using Better Auth.
  Covers the two separate auth instances (Next.js Web and TanStack Start Admin),
  session handling, Prisma adapter, authorization helpers in packages/auth, and
  the mandatory error contract. Use whenever touching auth, sessions, roles,
  sign-in/out, or protected routes in either app.
risk: low
source: project
date_added: "2026-09-20"
---

# Better Auth

Mini Workout uses **Better Auth** as the shared auth library via `@mini-workout/auth`.
The package exposes **two isolated instances** — one for `apps/web` (Next.js) and
one for `apps/admin` (TanStack Start) — because their framework cookie adapters
differ. Never cross-import auth instances between apps.

---

## When to Use

- Implementing or modifying sign-in, sign-out, registration, or session flows
- Adding or checking authorization / roles in a route or server action
- Configuring Better Auth plugins (email/password, OAuth, etc.)
- Debugging session issues or cookie behavior in either app
- Working with the Prisma adapter or database-backed session storage

---

## Package structure

```
packages/auth/
  src/
    index.ts          # Web Better Auth instance (Next.js)
    tanstack-start.ts # Admin Better Auth instance (TanStack Start)
    authorization.ts  # Shared role/permission helpers
    constants.ts      # Auth constants (roles, cookie names, etc.)
```

Public exports:
- `@mini-workout/auth` — Web auth instance + shared types
- `@mini-workout/auth/tanstack-start` — Admin auth instance
- `@mini-workout/auth/authorization` — Permission helpers
- `@mini-workout/auth/constants` — Shared constants

---

## Auth instances

### apps/web (Next.js)

```ts
// packages/auth/src/index.ts
import { betterAuth } from 'better-auth'
import { prismaAdapter } from '@better-auth/prisma-adapter'
import { db } from '@mini-workout/database'

export const auth = betterAuth({
  database: prismaAdapter(db, { provider: 'postgresql' }),
  // plugins, session config, etc.
})

export type Session = typeof auth.$Infer.Session
```

Usage in `apps/web`:
```ts
// Server component or Route Handler
import { auth } from '@mini-workout/auth'
import { headers } from 'next/headers'

const session = await auth.api.getSession({ headers: await headers() })
```

### apps/admin (TanStack Start)

```ts
// packages/auth/src/tanstack-start.ts — separate instance
import { betterAuth } from 'better-auth'
import { tanstackStartCookies } from '@better-auth/utils'

export const auth = betterAuth({
  // ...same DB adapter, different cookie adapter
  ...tanstackStartCookies(),
})
```

Usage in `apps/admin` server functions:
```ts
import { auth } from '@mini-workout/auth/tanstack-start'

const session = await auth.api.getSession({ headers: request.headers })
```

---

## Authorization

Shared role/permission checks live in `packages/auth/src/authorization.ts`.
Do not inline role comparisons in route files.

```ts
import { requireRole } from '@mini-workout/auth/authorization'

// Throws AuthorizationError if user lacks required role
await requireRole(session, 'admin')
```

---

## Protected routes

### apps/web (Next.js middleware)

```ts
// apps/web/src/middleware.ts
import { auth } from '@mini-workout/auth'
import { NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) return NextResponse.redirect(new URL('/login', request.url))
  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/workouts/:path*'],
}
```

### apps/admin (TanStack Router auth guard)

```ts
// apps/admin/src/routes/_authed.tsx
import { createFileRoute, redirect } from '@tanstack/react-router'
import { auth } from '@mini-workout/auth/tanstack-start'

export const Route = createFileRoute('/_authed')({
  beforeLoad: async ({ context }) => {
    const session = await auth.api.getSession({
      headers: context.request?.headers ?? new Headers(),
    })
    if (!session) throw redirect({ to: '/login' })
    return { session }
  },
})
```

---

## Error handling

Auth errors MUST follow `docs/ERROR_HANDLING_CONVENTION.md`:

```ts
import { AppError } from '@mini-workout/core'

// Authentication failed
throw new AppError('authentication', 'UNAUTHENTICATED', 'Please sign in')

// Authorized user lacks permission
throw new AppError('authorization', 'FORBIDDEN', 'Access denied')
```

- Never expose `error.message` from Better Auth directly to the user
- Use `requestId` context in error reports
- Expected auth outcomes (wrong password, expired session) are **not** unexpected errors — do not page on them

---

## Database schema

Better Auth manages its own tables via the Prisma adapter. Schema is
auto-generated into `packages/database/prisma/schema.prisma`:

```bash
# Regenerate auth schema (run from apps/web)
pnpm --filter @mini-workout/web auth:generate
```

Never hand-edit the auth-owned tables. Add application-level user fields by
extending the User model in a separate migration.

---

## Verification

```bash
# Type-check auth package
pnpm --filter @mini-workout/auth check-types

# Test
pnpm --filter @mini-workout/auth test

# Build (required by consuming apps)
pnpm --filter @mini-workout/auth build
```

---

## Singleton rules

- `packages/auth` owns the auth singleton; apps must import from there
- Never instantiate `betterAuth()` inside route files or server functions
- Web and Admin auth instances are intentionally different — do not merge them
- Do not access Prisma directly for auth data; use Better Auth APIs

---

## Stop conditions

Pause and ask if:
- Adding a new Better Auth plugin not currently in the package
- Changing session expiry, cookie settings, or trusted origins
- Adding OAuth providers that require new environment variables
- Modifying the Prisma auth schema without a corresponding migration plan
