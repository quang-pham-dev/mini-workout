---
name: observability-convention
description: >
  Quick-reference skill for the mandatory error handling and observability
  contract in mini-workout. Covers error classification, the shared AppError
  contract, logger usage, PII/secret redaction rules, and telemetry best-effort
  requirements. Read this before touching API routes, Server Actions, server
  functions, auth boundaries, data fetching, or any observability code.
  The full convention is in docs/ERROR_HANDLING_CONVENTION.md.
risk: low
source: project
date_added: "2026-09-20"
---

# Observability & Error Handling Convention

> **This skill is a quick-reference companion to `docs/ERROR_HANDLING_CONVENTION.md`.**
> For full detail, read the source document. This skill summarises the
> non-negotiable rules and patterns you need before writing any code that
> touches errors, routes, server functions, auth, data fetching, or telemetry.

---

## When to Use

Activate this skill whenever the task involves:

- API route handlers (`apps/web/src/app/api/`)
- Next.js Server Actions (`'use server'`)
- TanStack Start server functions (`createServerFn`)
- Auth boundaries, session checks, or authorization helpers
- Data fetching from `packages/core` or `packages/database`
- Observability code in `packages/observability`
- PostHog event tracking or Web Vitals reporting

---

## Non-negotiable rules (summary)

| Rule | Detail |
|------|--------|
| Classify before acting | Every error must have a `category` before deciding to report, surface, or swallow it |
| Stable error codes | Use codes from `ErrorCode` — never match on `error.message` as control flow |
| Preserve framework errors | Next.js `redirect()`, `notFound()`, TanStack `redirect()` must propagate — do not catch them |
| Report at the boundary | Report unexpected errors **once** at the outermost boundary (route/action/server function) |
| Safe public messages | Never expose `error.message`, `error.stack`, DB messages, or digests to users |
| No PII in telemetry | Never log passwords, tokens, cookies, auth headers, emails, raw form values, connection strings |
| Telemetry is best-effort | A reporter failure MUST NOT fail or replace the original response |
| No paging on 4xx | Alert on rates/SLOs/fingerprints — not individual expected user errors |
| Tests for every boundary | Add tests for mapping, fallback, retry, and redaction for every new boundary |

---

## Error classification

```ts
// From packages/core (do not redefine inline)
type ErrorCategory =
  | 'validation'
  | 'authentication'
  | 'authorization'
  | 'not_found'
  | 'conflict'
  | 'rate_limited'
  | 'dependency'
  | 'configuration'
  | 'internal'

// Use AppError — never throw plain Error for domain failures
import { AppError } from '@mini-workout/core'

throw new AppError('not_found', 'WORKOUT_NOT_FOUND', 'Workout not found')
throw new AppError('validation', 'INVALID_INPUT', 'Title is required')
```

---

## Logging

```ts
import { createLogger } from '@mini-workout/observability'

// Create once per service module — never at module scope in routes
const logger = createLogger({ service: 'workout-service' })

logger.info('workout.created', { workoutId, userId })
logger.error('workout.save.failed', { error: normalizeError(err), requestId })
```

Rules:
- Use `createLogger({ service })` — never `console.log` in server code
- Include `requestId`, route, operation, and entity ID as structured context
- Never log passwords, tokens, cookies, auth headers, emails, raw bodies

---

## Error reporting

```ts
import { getObservability } from '@mini-workout/observability'

const { errorReporter } = getObservability()

// Report unexpected errors — wrap to keep telemetry best-effort
try {
  errorReporter.report(err, { requestId, route, userId })
} catch {
  logger.warn('error.report.failed', { requestId })
}
```

---

## Framework control-flow errors

```ts
// apps/web — MUST re-throw Next.js control-flow
import { redirect, notFound } from 'next/navigation'
import { isNextRedirectError, isNextNotFoundError } from 'next/dist/client/components/redirect'

try {
  await doSomething()
} catch (err) {
  if (isNextRedirectError(err) || isNextNotFoundError(err)) throw err
  // handle/report other errors
}

// apps/admin — MUST re-throw TanStack Router redirect
import { redirect } from '@tanstack/react-router'
// catch block: if (err instanceof RedirectError) throw err
```

---

## Server Action error pattern (apps/web)

```ts
'use server'

import { AppError, normalizeError } from '@mini-workout/core'

export async function createWorkout(input: unknown) {
  try {
    const validated = WorkoutInput.parse(input) // throws on validation failure
    return await workoutService.create(validated)
  } catch (err) {
    if (err instanceof AppError) {
      // Expected domain error — return safe user message
      return { error: err.userMessage }
    }
    // Unexpected — report once, return generic message
    errorReporter.report(normalizeError(err), context)
    return { error: 'Something went wrong. Please try again.' }
  }
}
```

---

## Health endpoints

- `/api/health/live` — liveness only; **no DB I/O**, returns 200 when route runs
- `/api/health/ready` — calls `pingDatabase()` from `@mini-workout/database`; returns 503 on failure
- Health routes consume `getObservability()` — **never** create a second logger at module scope

---

## Request ID propagation

```ts
// Every HTTP boundary should preserve or create x-request-id
const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID()
// Forward to downstream calls and include in logs/reports
```

---

## Required tests for new boundaries

Every new route/action/server function boundary must include tests for:

1. Expected error mapping (e.g., `WORKOUT_NOT_FOUND` → 404 response)
2. Unexpected fallback (generic message returned, error reported once)
3. Retry/rate-limit policy if applicable
4. Secret/PII redaction in logs

---

## Full reference

Read `docs/ERROR_HANDLING_CONVENTION.md` for:
- Full `ErrorCode` enum
- PostHog event-capture rules and consent requirements
- Alert noise rules and SLO thresholds
- Implementation checklist per boundary type
