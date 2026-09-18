# Error Handling And Observability Convention

This is the mandatory convention for all engineers and coding agents working on
Mini Workout. It applies to `apps/web`, `apps/admin`, `packages/core`,
`packages/auth`, `packages/database`, and `packages/observability`.

The implementation plan is [Error Handling And Observability
Plan](superpowers/plans/2026-09-16-error-handling-observability.md). This
document defines the rules that code must follow after implementation begins.

## Non-negotiable rules

- MUST classify an error before deciding whether to report it.
- MUST use stable error codes; MUST NOT match error messages as control flow.
- MUST preserve framework control-flow errors such as Next `redirect()` and
  `notFound()`.
- MUST report unexpected errors at the outermost application boundary exactly
  once per request/operation.
- MUST return safe, generic public messages for unexpected errors.
- MUST NOT render `error.message`, `error.stack`, database messages, provider
  details, or exception digests directly to users.
- MUST NOT send passwords, tokens, cookies, authorization headers, emails, raw
  form values, query strings, request/response bodies, or connection strings to
  logs or PostHog.
- MUST use `requestId`, `service`, `environment`, `release`, `route`, and
  `operation` in report context whenever available.
- MUST make telemetry best-effort. A reporter failure MUST NOT fail or replace
  the original application response.
- MUST NOT page on expected 4xx/user errors. Alert on rates, SLOs, and grouped
  fingerprints of actionable failures.
- MUST add tests for expected mapping, unexpected fallback, retry policy, and
  secret/PII redaction for every new boundary.

## Error classification

Use the shared error contract rather than ad hoc `Error` instances:

```ts
type ErrorCategory =
  | 'validation'
  | 'authentication'
  | 'authorization'
  | 'not_found'
  | 'conflict'
  | 'rate_limited'
  | 'dependency'
  | 'configuration'
  | 'internal';

type ErrorCode =
  | 'INPUT_INVALID'
  | 'AUTH_REQUIRED'
  | 'ADMIN_REQUIRED'
  | 'RESOURCE_NOT_FOUND'
  | 'RESOURCE_CONFLICT'
  | 'DEPENDENCY_UNAVAILABLE'
  | 'CONFIG_INVALID'
  | 'INTERNAL_ERROR';
```

| Situation                  | Code                     | Report? |           Alert? | UI/transport behavior             |
| -------------------------- | ------------------------ | ------: | ---------------: | --------------------------------- |
| Invalid form/API input     | `INPUT_INVALID`          |      No |               No | Field/form error, HTTP 400        |
| Missing session            | `AUTH_REQUIRED`          |      No |               No | Redirect or HTTP 401              |
| Insufficient role          | `ADMIN_REQUIRED`         |      No |               No | Forbidden page or HTTP 403        |
| Missing resource           | `RESOURCE_NOT_FOUND`     |      No |               No | Not-found state or HTTP 404       |
| Expected business conflict | `RESOURCE_CONFLICT`      |      No |               No | Explain conflict, HTTP 409        |
| Database/upstream outage   | `DEPENDENCY_UNAVAILABLE` |     Yes |         Rate/SLO | Generic retryable error, HTTP 503 |
| Invalid deployment config  | `CONFIG_INVALID`         |     Yes |        Immediate | Fail startup/deployment           |
| Unknown defect             | `INTERNAL_ERROR`         |     Yes | Rate/fingerprint | Generic non-retryable error       |

Expected does not mean irrelevant: validation, auth, not-found, and conflict
events may be counted for UX/security dashboards, but they are not exceptions
and must not create on-call alerts by default.

## Layer ownership

### Domain/service layer

Owns business meaning. It validates service inputs and throws typed domain
errors. It does not import Next, TanStack Router, HTTP response types, PostHog,
or React.

```ts
if (!workout) {
  throw new NotFoundError({
    code: 'RESOURCE_NOT_FOUND',
    message: 'Workout not found',
  });
}
```

Do not throw `new Error('Unknown interest')` for a known validation outcome.
Do not catch an error only to log and rethrow.

### Repository/infrastructure layer

Owns provider-specific normalization. Preserve the original error as `cause`
and map known Prisma, Better Auth, fetch, or runtime failures to a stable
dependency/configuration error. Never expose provider messages beyond this
layer.

```ts
try {
  return await prisma.workout.findUnique({ where: { id } });
} catch (cause) {
  throw new DependencyError({
    code: 'DEPENDENCY_UNAVAILABLE',
    message: 'Workout storage is unavailable',
    cause,
  });
}
```

### Application/transport boundary

Owns request context, classification, public mapping, reporting, and response
headers. Each boundary reports once and maps expected errors consistently.

```ts
try {
  return await useCase(input);
} catch (error) {
  if (isFrameworkControlFlow(error)) throw error;

  const classified = classifyError(error, context);
  if (classified.reportable) await reportOnce(classified, context);
  return toPublicResponse(classified);
}
```

### UI boundary

Owns user-safe copy, accessibility, empty/not-found states, and retry controls.
It never owns severity classification or telemetry credentials.

```tsx
<ErrorState
  title="Something went wrong"
  description="We couldn't complete that request. Please try again."
  requestId={error.requestId}
  retry={error.retryable ? reset : undefined}
/>
```

### Observability adapter

Owns serialization, sanitization, sampling, deduplication, and vendor calls.
Feature code depends on `ErrorReporter`/`EventReporter`, never directly on the
PostHog SDK. Adapter failures are swallowed after a safe fallback log.

## Framework rules

### Next.js Web

- Server Components use `notFound()` only for genuinely missing resources and
  allow unexpected errors to reach the instrumented boundary.
- Server Actions preserve redirect exceptions; do not put `redirect()` inside
  a catch block unless the framework control-flow guard is explicit.
- Route Handlers use the shared API error handler and always return `x-request-id`.
- `app/error.tsx` and `global-error.tsx` show generic copy only.
- Validation/form errors return typed action state or safe query state; they do
  not report as internal exceptions.
- Never call an internal Route Handler from a Server Component just to reuse
  error handling; use the application/service boundary directly.
- Health routes have separate contracts: `/api/health/live` performs no
  dependency I/O and returns 200 when the handler executes; `/api/health/ready`
  calls only `@mini-workout/database`'s `pingDatabase()` and returns 503 for an
  unhealthy dependency. Readiness includes a request ID and
  `cache-control: no-store`.
- Health routes use `getObservability()` after app lifecycle initialization by
  `instrumentation.ts`; they must not construct a route-local logger or another
  infrastructure singleton at module scope.

### TanStack Admin

- Server functions validate/authenticate/authorize independently and use the
  shared boundary adapter.
- Router `errorComponent` is presentation and recovery, not a second reporter.
- TanStack Query must not independently report an error already reported by the
  server-function boundary.
- Retry only when the classified error is retryable and the operation is safe.
- Admin denial is expected authorization behavior, not an internal error.

## Logging convention

Use a child logger with stable fields:

```ts
const operationLogger = logger.child({
  service: 'web',
  route: '/api/v1/workouts/:id/like',
  operation: 'workout.like.update',
  requestId,
  release,
});

operationLogger.error('Unexpected workout like failure', error, {
  errorCode: classified.code,
  fingerprint: classified.fingerprint,
});
```

Messages MUST be stable and actionable. Do not put IDs or dynamic values into
the message; put approved, sanitized values in context. Do not use logs as a
database. Avoid logging expected validation/auth failures at `error` level.

Minimum levels:

- `debug`: local diagnostics only, never an alert source.
- `info`: lifecycle and successful health/operation milestones.
- `warn`: degraded but handled behavior, rate-limited expected anomalies.
- `error`: unexpected actionable failures after classification.

## PostHog convention

PostHog is accessed only through the adapter. Use stable event names and an
allowlist of properties. The SDK's anonymous identity is used before login;
after server-verified login, identify with the internal user ID. Do not use
email as `distinct_id` or as an error property.

Allowed error properties:

```ts
{
  error_code,
  error_category,
  service,
  environment,
  release,
  route_template,
  operation,
  request_id,
  trace_id,
  fingerprint,
  retryable,
  severity,
}
```

Identity rules:

1. Anonymous browser errors use the SDK-managed anonymous distinct ID.
2. After login/session hydration, call `identify(internalUserId)` once per
   identity transition.
3. Server context may attach internal user ID only after verifying the session.
4. Never trust a browser-supplied user ID for authorization or attribution.
5. On logout, reset the browser identity according to the adapter contract.
6. Keep PostHog disabled/no-op when configuration or consent does not allow it.

The shared identity components implement this transition: a verified internal
ID calls `identify`, and a missing session calls `reset`. Logout flows must
invalidate the application session first; telemetry reset is a consequence of
the resulting unauthenticated session state, not a substitute for logout.

Consent is controlled by `POSTHOG_REQUIRE_CONSENT` for Web and
`ADMIN_POSTHOG_REQUIRE_CONSENT` for Admin. When enabled, the product must write
`mini-workout:analytics-consent=granted` only after the user has opted in.
Until that UI/policy is supplied, keep the flag disabled in environments where
analytics consent is not collected.

## Alert-noise convention

The unit of alerting is a grouped incident, not an individual exception.

- Group by stable fingerprint and release/environment.
- Alert on threshold + rolling window + consecutive breach, not one event.
- Exclude expected 400/401/403/404 and handled 409 from paging.
- Do not alert separately from browser, server, Query, and Router for one flow.
- Do not retry infinitely or alert on every retry attempt.
- Preserve first/last seen, affected request count, and representative request
  ID for diagnosis.
- Startup/configuration failures bypass sampling and fail fast.
- Review thresholds after observing a baseline; document owner and runbook URL.

## Required tests

Every error boundary must test:

- each expected error maps to the documented code/status/public message;
- redirect/not-found control flow is preserved;
- unknown errors become `INTERNAL_ERROR` without leaking details;
- report happens once, not once per framework layer;
- retry is present only for retryable operations;
- request ID is generated/propagated and returned;
- logger/PostHog payloads contain only allowlisted fields;
- reporter failure does not change the application response;
- repeated errors share a fingerprint and are rate-limited/sampled correctly.

Use unit tests for pure classification/sanitization, integration tests for
Route Handlers/Server Functions/Actions, and E2E tests for user-visible error,
retry, request-ID, and privacy behavior.

## Agent and PR checklist

Before generating or approving code that touches a boundary, the engineer/agent
MUST answer these questions in the change description:

- What is the expected error category/code for each failure path?
- Is this error user-facing, reportable, retryable, or alertable? Why?
- Which layer owns the mapping and which layer reports it?
- How are Next/TanStack control-flow errors preserved?
- What request/trace/release context is attached?
- What data is explicitly excluded from logs and PostHog?
- Which tests prove no duplicate reports and no alert noise?

Reject the change if it introduces direct `console.error` in request code,
direct PostHog imports in features/domain code, raw error rendering, string
matching on messages, unbounded retries, or a new ad hoc response shape.
