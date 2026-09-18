# Admin Architecture

`apps/admin` is the deployable TanStack Start application. It is a transport
and UI composition boundary over shared domain/auth/database packages; it is not
the owner of domain rules or Prisma access.

## Dependency layers

```text
routes/       route composition, URL/search state, redirects, UI composition
    ↓
features/     admin use cases, server functions, query options, serialized views
    ↓
lib/          framework adapters, auth middleware, telemetry, security helpers
    ↓
workspace packages (@mini-workout/core, auth, database, observability, ui)
```

The dependency direction is enforced by `eslint-plugin-boundaries` in
`eslint.config.js`:

- Routes may import shared components/libs and feature public entrypoints only.
- A route must not import another route, including a sibling route component.
- Features may use their own files and lower-level libs, but must not import
  routes or UI components.
- Components may use other components and lower-level libs, but never routes or
  feature internals.
- Libs may use other libs, but never routes, features, or components.
- Workspace package imports must use declared package exports.

The `features/admin/index.ts` barrel is the public entrypoint for the current
admin feature. It exposes route-facing schemas, serialized view types, query
options, and server-function capabilities. Implementation files remain private
to the feature. Unit tests may import an internal module when they specifically
test that module's boundary.

## Server and client boundaries

- `features/admin/server-functions.ts` is the server-function boundary. It
  validates input, applies the admin middleware, delegates to `packages/core`,
  reports unexpected errors once, and preserves framework control flow.
- `features/admin/load-page.ts` converts domain `Date` values into serialized
  admin view data. It must not leak Prisma models or persistence shapes to the
  browser.
- Route loaders prefill a request-scoped `QueryClient`; browser components read
  that same router/query cache through TanStack Query.
- `getRouter()` intentionally creates one `QueryClient` per router/request.
  Do not move it to `globalThis`: a global QueryClient would leak auth-scoped
  data across SSR requests. A browser runtime should have one router instance,
  while SSR retains request isolation.

## Singleton and lifecycle ownership

- `@mini-workout/auth/tanstack-start` owns the server Better Auth instance.
- `apps/admin/src/lib/auth-client.ts` owns the browser Better Auth client and
  uses a namespaced `globalThis` guard during development/HMR.
- `apps/admin/src/start.ts` owns the single TanStack Start instance and the
  security/CSRF middleware chain.
- `@mini-workout/database` owns the Prisma singleton. Admin code must never
  call `new PrismaClient()` directly in routes, features, or components.
- PostHog browser initialization is lazy and deduplicated through a module-level
  promise. Telemetry failures must never affect route or server-function
  control flow.

When changing an owned instance, add a module-reload or lifecycle test. Do not
create a second adapter merely to work around import order; fix the owning
entrypoint instead.

## Adding an admin capability

1. Add or extend the use case in `packages/core` if it is domain behavior.
2. Add the admin serialized view, validator, query options, and server function
   under `src/features/admin/`.
3. Export the route-facing capability from `src/features/admin/index.ts`.
4. Compose it from a route without importing another route or feature internal.
5. Add tests for validation, authorization, serialization, query hydration, and
   the relevant route state.
6. Run the admin and workspace checks:

```bash
pnpm --filter @mini-workout/admin lint
pnpm --filter @mini-workout/admin check-types
pnpm --filter @mini-workout/admin test
pnpm --filter @mini-workout/admin build
pnpm exec turbo boundaries
```

The repository-wide ownership rules in [`../../../docs/ARCHITECTURE.md`](../../../docs/ARCHITECTURE.md)
take precedence over this app-specific guide.
