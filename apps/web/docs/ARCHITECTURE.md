# Web Application Architecture

## Responsibilities

`apps/web` is the deployable Next.js App Router application. It owns routing,
page composition, metadata, server/client boundaries, runtime configuration,
and product feature composition.

It may consume shared packages through their public exports, but packages must
not import from this app.

## Route and rendering conventions

- Use Server Components by default.
- Add `'use client'` only at the smallest interactive boundary.
- Fetch data directly in Server Components or server-side application modules;
  do not call an internal Route Handler from a Server Component.
- Use `loading.tsx` for loading UI, `error.tsx` for recoverable route errors,
  `not-found.tsx` for missing resources, and `global-error.tsx` for uncaught
  application failures.
- Keep landing-page, authenticated-dashboard, and API route groups separated
  when those product areas are introduced.

## Feature structure

Use the `src` boundary for application code:

```text
src/
  app/                  # routes and route composition
  features/<feature>/   # feature UI, schemas, and use cases
  lib/                  # app-wide infrastructure and adapters
  auth/
  data/
  observability/
  validation/
  auth.ts               # Better Auth server instance
  proxy.ts              # optimistic request routing guard
prisma/                 # schema, migrations, and seed data
tests/                  # feature and integration tests
```

The `@/*` TypeScript alias maps to `src/*`. Use it for imports across feature,
infrastructure, and route boundaries; relative imports are appropriate only
for files that are direct siblings in the same feature or route folder.

Extract a feature into `packages/` only when it has a real consumer outside the
web app. Do not create speculative domain packages.

### Styling and shared UI

- Use `@mini-workout/ui` components for reusable interaction contracts such as
  Button, Input, Label, Card, and future shadcn-style primitives.
- Use semantic Tailwind utilities for common spacing, color, typography, and
  state styling.
- Use Tailwind utilities for page-specific composition, responsive grids,
  pseudo-states, and small visual systems. Do not create a package component
  for one-off product copy or layout.

### Type safety

- TypeScript `strict` mode is required for application and package code.
- Explicit `any` is forbidden by the shared ESLint configuration. Use an
  unknown-first boundary with a type guard or schema validation when data is
  untrusted.
- Do not weaken a type to make a component or database query compile. Define a
  focused DTO/select shape instead.

## Data layer

Use this direction when the backend is introduced:

```text
route/page/server action
        ↓
feature use case/service
        ↓
repository or API client
        ↓
database/external service
```

Validate untrusted input at the boundary. Keep persistence details out of UI
components. Use explicit DTOs or shared types for data crossing a boundary.

### Authentication slice

The first authentication slice is intentionally local to `apps/web`:

```text
login/register Server Action
        ↓
Better Auth email/password API
        ↓
Prisma adapter (User, Account, Session, Verification)
        ↓
PostgreSQL
```

- `auth.ts` is the single Better Auth server instance and owns the Prisma
  adapter, email/password API, database sessions, and `nextCookies` integration.
- `app/api/auth/[...all]/route.ts` mounts Better Auth's standard HTTP handler.
- `proxy.ts` performs an optimistic cookie check for redirects only. It must
  not be treated as the authorization boundary.
- `(app)/layout.tsx` and every protected Server Action/Route Handler perform a
  server-side `auth.api.getSession()` check before reading or mutating data.
- Better Auth owns password hashing and stores credentials in its `Account`
  model. Passwords, account secrets, and session tokens must never be logged,
  returned in DTOs, or exposed to client components.
- Sessions are database-backed to support revocation and multi-device session
  management. This adds database reads to session validation but is the safer
  default for this product.

The current schema includes Better Auth's `User`, `Account`, `Session`, and
`Verification` models plus the product's `onboardingCompleted` field. Prisma
migrations, password reset, email verification, rate limiting, and E2E auth
coverage are separate follow-up work.

### Onboarding slice

Onboarding is the first product feature after authentication. It is deliberately
implemented as a small vertical slice:

```text
onboarding page (Server Component)
        ↓
OnboardingForm (small Client Component for selection state)
        ↓
completeOnboarding Server Action
        ↓
Zod boundary validation + Better Auth session check
        ↓
Prisma transaction (User + UserInterest)
        ↓
PostgreSQL
```

- `Interest` is seeded reference data; the browser submits IDs, but the server
  verifies every ID before writing it.
- `UserInterest` is a composite-key join table so interests remain normalized
  and can later support recommendation queries without storing arrays in the
  user row.
- `/home` checks `onboardingCompleted` server-side and redirects incomplete
  users to `/onboarding`. Middleware remains an optimistic navigation aid, not
  the authorization boundary.
- The form uses shared Button and semantic design-system tokens. Its layout and
  copy are feature-specific, so they stay in `apps/web` rather than expanding
  the reusable UI package prematurely.
- Invalid submissions return a safe generic message. Database and unexpected
  errors must be reported through the observability package as that boundary is
  integrated.

### Consumer and future admin surfaces

`apps/web` is intentionally a full-stack Next.js application for the MVP. It
can support both consumer and admin experiences without splitting deployment
units prematurely:

```text
apps/web/app/
├── (marketing)/        public landing and acquisition routes
├── (auth)/             login and registration
├── (consumer)/         onboarding, home, workouts, favourites, profile
├── (admin)/            future CRUD dashboard and admin-only routes
└── api/                explicit HTTP boundaries, including Better Auth

apps/web/features/
├── auth/
├── onboarding/
├── workouts/
├── recommendations/
└── admin/              future management use cases, not shared UI state
```

The admin surface should reuse `@mini-workout/ui` and design-system contracts,
but it must have separate route authorization and use-case/service boundaries.
Admin CRUD must never rely on hiding UI controls; every mutation must enforce
role/permission checks server-side. Extract a separate admin app or backend only
when independent deployment, team ownership, security isolation, or workload
scaling justifies the operational cost.

### MVP versus scale trade-offs

The current choice is a modular monolith: one Next.js deployable owns UI,
Server Actions, Route Handlers, authentication, and domain services.

Advantages:

- Fastest path to a working product with one deployment and one auth boundary.
- Server Components can read data without an internal HTTP hop.
- Shared transactions and authorization are straightforward.
- Lower operational cost while product requirements are still changing.

Costs and guardrails:

- A single deployable couples release cadence and runtime scaling for consumer
  and admin traffic.
- Long-running jobs, video processing, recommendation computation, and large
  admin exports should move to queues/workers when introduced.
- Keep domain logic behind feature use cases and repositories so a future API
  or worker can reuse it without importing React or route modules.
- Keep admin routes and permissions separate from consumer routes from day one;
  sharing a deployment does not mean sharing authorization policy.

Do not split `apps/web` pre-emptively. Re-evaluate an admin app or separate API
when at least one concrete signal exists: independent team ownership, separate
deployment/release requirements, materially different scaling profiles,
security/compliance isolation, or a stable external API consumer.

### Workout discovery slice

The first content domain keeps discovery server-rendered and database-backed:

```text
home Server Component
  ├── user interests → recommended published workouts
  └── publishedAt → latest published workouts
                  ↓
             workout detail
```

- `Coach`, `Category`, and `Workout` are normalized product entities.
- `WorkoutInterest` links content to the same seeded interest vocabulary used
  by onboarding; this keeps the first recommendation query explainable and
  avoids introducing a recommendation service prematurely.
- Only `isPublished` workouts are exposed to consumer routes. Future admin
  CRUD must use separate authorization and mutation use cases.
- The MVP stores a `videoUrl` and `thumbnailUrl`, but the detail page currently
  presents a media placeholder. Video hosting, transcoding, upload workflows,
  and CDN policy are intentionally deferred until content operations exist.
- The page reads Prisma directly from Server Components. Do not call an
  internal HTTP endpoint for this same-server read; introduce an API boundary
  only for external consumers or an independently deployed client.

## Error handling

- Expected errors become typed results or safe user-facing messages.
- Unexpected errors are reported through `@mini-workout/observability`.
- Never expose stack traces, credentials, or provider error details to users.
- Every new route segment must define loading, empty, error, and not-found
  behavior when applicable.

## Network and security

- Keep secrets server-side; only explicitly public values use `NEXT_PUBLIC_`.
- Validate request bodies, query parameters, headers, and uploaded files.
- Authenticate and authorize every protected Server Action and Route Handler.
- Add rate limits before exposing expensive or user-controlled operations.
- Configure CSP and security headers when third-party scripts or APIs are added.

## Observability

Use the service name `web` and propagate `requestId` through server boundaries.
See [`docs/OBSERVABILITY.md`](../../../docs/OBSERVABILITY.md).

## Testing contract

- Unit tests cover pure feature logic and validation.
- Component tests cover important interaction and accessibility behavior.
- E2E tests cover critical user journeys and deployment smoke checks.
- Each feature adds tests with the feature; testing is not deferred until the
  end of the product build.

The authentication slice currently has focused Vitest coverage for input
normalization, credential boundaries, protected paths, and open-redirect
prevention. Database-backed registration/login and browser flows require a
configured test database and are planned for the next quality step.
