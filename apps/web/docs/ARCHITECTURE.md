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

Start with feature folders inside this app:

```text
app/                    # routes and route composition
features/<feature>/     # feature UI, schemas, and use cases
lib/                    # app-wide infrastructure and adapters
  auth/
  data/
  observability/
  validation/
```

Extract a feature into `packages/` only when it has a real consumer outside the
web app. Do not create speculative domain packages.

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
