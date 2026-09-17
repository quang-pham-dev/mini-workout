# Error Handling And Observability Plan

> **For agentic workers:** Execute only after explicit approval. This document is
> a plan, not an implementation. Keep each task independently reviewable and
> preserve the current Web/Admin deployment boundaries.

## Goal

Create one consistent error architecture for `apps/web` (Next.js App Router)
and `apps/admin` (TanStack Start/Router/Query) that:

- distinguishes expected user/domain outcomes from real defects;
- returns safe, stable responses to users and API consumers;
- reports actionable unexpected failures with request correlation;
- integrates PostHog through an adapter without coupling domain code to its SDK;
- supports anonymous browser errors and later authenticated identity association;
- prevents duplicate reports, high-volume expected-error alerts, and sensitive
  data leakage.

## Scope decisions

- In scope: `apps/web`, `apps/admin`, `packages/core`, `packages/auth`,
  `packages/observability`, tests, and related documentation.
- PostHog is a first-class integration target, but vendor calls remain behind
  an observability port/adapter.
- Internal user IDs may be used as PostHog `distinct_id` after authentication.
  Anonymous client errors use the PostHog-generated anonymous distinct ID; on
  login, the client identifies the internal user ID so subsequent events are
  associated with that user. No email, password, cookie, token, request body,
  or raw form values are sent as error properties.
- Expected validation, authentication, authorization, not-found, redirects,
  offline states, and handled business conflicts are not production exceptions.
- This phase does not add a second backend, queue, or a provider-specific
  logging vendor.

## Current audit verdict

The repository has useful foundations but not an end-to-end system yet.

### Existing strengths

- `packages/core/src/errors.ts` already defines `NotFoundError`,
  `UnauthorizedError`, and `ValidationError`.
- `parseInput()` centralizes Zod-to-domain validation conversion.
- `packages/observability` provides structured logging, redaction, request
  context, health checks, and an `ErrorReporter` interface.
- Web has a route error boundary and API error mapping for the like endpoint.
- Admin has route error/retry UI and TanStack Query error propagation.
- Existing tests cover several domain error mappings and observability
  primitives.

### Gaps and risks

- `apps/web/src/app/error.tsx` renders `error.message` directly and does not
  report the failure.
- Web API handlers map errors ad hoc and do not share an error envelope,
  request ID response header, or unexpected-error adapter.
- Server Actions mix validation redirects, form state, authentication
  redirects, domain exceptions, and unhandled rethrows without a shared
  boundary.
- `apps/web/src/features/workouts/actions.ts` and some onboarding actions have
  no explicit unexpected-error reporting boundary.
- Admin route errors are user-safe but are not reported; query/server-function
  behavior is not standardized.
- Core errors have no stable code, HTTP status, retryability, or public-message
  contract. `UnauthorizedError` is also used for an admin-role denial, which
  should be distinguished from unauthenticated access.
- `packages/observability/src/sanitizer.ts` is empty. Logger redaction is
  shallow by key pattern and does not define a complete telemetry allowlist.
- `createRequestContext()` accepts arbitrary incoming request IDs and parses
  traceparent without validating W3C lengths/format. Response propagation is
  incomplete.
- The observability package is mostly unused by application boundaries.
- Documentation claims such as Pino and `checkHealth` do not match the current
  implementation and must be reconciled before rollout.

## Target architecture

```text
Browser / Server Component / Server Action / Route Handler / Admin Server Fn
                              |
                    framework boundary adapter
                  (catch, classify, correlate, report once)
                              |
                    AppError / ErrorPolicy contract
                (code, category, status, safe message, retry)
                              |
                 domain service / auth / repository
                              |
                    infrastructure error normalization
                              |
     structured logger + ErrorReporter + metrics/event port + PostHog adapter
                              |
             logs / PostHog Error Tracking / future alert sink
```

### Layer 1 — User and framework surfaces

Responsibilities:

- render a safe message and an appropriate recovery action;
- preserve accessibility (`role="alert"`, retry focus behavior);
- never decide severity based only on HTTP status;
- never send raw framework errors to the UI.

Web uses `error.tsx`/`global-error.tsx`, form state, and route-specific empty or
not-found states. Admin uses Router `errorComponent`, Query error states, and
server-function result mapping. Redirects are control flow, not failures, and
must not be captured.

### Layer 2 — Transport/application boundary

Create framework-specific adapters that call one shared classifier:

- Next Route Handler: `handleApiError(error, context)` returns the standard
  JSON envelope and `x-request-id`.
- Next Server Action: `handleActionError(error, context)` returns typed form
  state for expected input/business outcomes and rethrows after reporting an
  unexpected error. It must recognize Next redirect/not-found control-flow
  errors and pass them through.
- Next Server Component boundary: let expected not-found/redirect control flow
  pass through; report unexpected errors once before the framework boundary.
- TanStack server function: normalize expected errors into a serializable
  transport error/result and report unexpected errors once.
- TanStack route/query UI: render the safe error contract and retry only when
  `retryable === true` or the operation is explicitly safe to retry.

### Layer 3 — Error contract and policy

Introduce a shared `AppError` contract in `@mini-workout/observability` or a
small shared error-contract module, keeping domain packages free of framework
types:

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

interface AppErrorShape {
  code: string; // stable machine-readable code
  category: ErrorCategory;
  message: string; // never provider/database detail
  status: number; // transport default only
  retryable: boolean;
  reportable: boolean; // unexpected defects/dependency incidents
  cause?: unknown;
  details?: Record<string, unknown>; // sanitized, non-secret diagnostics
}
```

Recommended initial codes:

| Code                     | Category       |  Status | Report/alert default     |
| ------------------------ | -------------- | ------: | ------------------------ |
| `INPUT_INVALID`          | validation     |     400 | no                       |
| `AUTH_REQUIRED`          | authentication |     401 | no                       |
| `ADMIN_REQUIRED`         | authorization  |     403 | no                       |
| `RESOURCE_NOT_FOUND`     | not_found      |     404 | no                       |
| `RESOURCE_CONFLICT`      | conflict       |     409 | no, metric only          |
| `DEPENDENCY_UNAVAILABLE` | dependency     |     503 | yes, alert by rate/SLO   |
| `CONFIG_INVALID`         | configuration  | 500/503 | yes, critical at startup |
| `INTERNAL_ERROR`         | internal       |     500 | yes                      |

Existing domain errors should become subclasses/factories of this contract;
avoid string matching on error messages. Keep compatibility aliases during
migration if existing tests/imports need them.

### Layer 4 — Classification, normalization, and deduplication

The classifier must:

1. preserve framework control-flow errors (`redirect`, `notFound`) untouched;
2. normalize `unknown` safely;
3. map known `AppError` instances to public transport data;
4. map known library errors (Prisma, Better Auth, fetch/network) at the
   infrastructure boundary into stable internal codes;
5. default unknown errors to `INTERNAL_ERROR` with a generic public message;
6. generate a deterministic fingerprint from `service + code + normalized
error name/message + route/operation`, excluding IDs and raw input;
7. report only at the outermost boundary, with a per-request report guard;
8. sample or rate-limit repeated low-impact reports while never sampling
   startup/configuration failures or high-confidence dependency incidents.

### Layer 5 — Observability ports and adapters

Keep application code dependent on interfaces:

```ts
interface ErrorReporter {
  report(input: {
    error: unknown;
    context: ErrorContext;
    severity?: 'warning' | 'error' | 'critical';
  }): void | Promise<void>;
}

interface EventReporter {
  capture(event: string, properties: SafeEventProperties): void;
  identify(userId: string, properties?: SafeUserProperties): void;
}
```

Implement in stages:

- `ConsoleErrorReporter`/structured log reporter for local and CI;
- `PostHogReporter` in an app integration package or observability adapter,
  loaded only where runtime supports it;
- a no-op reporter when PostHog is disabled or not consented;
- future Sentry/Datadog adapter without changing domain/transport code.

PostHog event capture should use stable event names and allowlisted properties.
PostHog documents `capture` for custom events and `identify`/identity
resolution for associating events with users; verify exact SDK setup and
identity behavior again when implementation starts. See the [PostHog event
capture documentation](https://posthog.com/docs/product-analytics/capture-events).

### Layer 6 — Runtime sinks, dashboards, and alert policy

Logs are for diagnosis; PostHog Error Tracking/events are for grouping and
product impact; uptime/health checks are for availability. Do not alert on each
log line.

Initial alert policy:

- page/route `INTERNAL_ERROR`: alert only on a threshold over a rolling window
  and group by fingerprint;
- `DEPENDENCY_UNAVAILABLE`: alert when error rate and/or health check breach a
  defined SLO for consecutive windows;
- `CONFIG_INVALID`: fail deployment/startup and alert immediately;
- 4xx expected outcomes: dashboard/metrics only, no on-call alert;
- validation/auth failures: track aggregate rates to detect abuse or UX
  regressions, never page by default;
- health endpoint: liveness must stay cheap; readiness/dependency checks must
  have bounded timeouts and separate alert thresholds.

Every alert must include service, environment, release, route/operation,
fingerprint, first/last seen, affected request count, and a representative
request ID. Do not include raw user input or secrets.

## Identity and privacy flow

1. Initialize the PostHog browser SDK only in the browser app shell, with
   autocapture/session replay/privacy settings explicitly configured.
2. Before login, let PostHog maintain its anonymous distinct ID. Client error
   events include `distinct_id` implicitly through the SDK, plus our own
   `request_id` when available.
3. After successful login/session hydration, call `identify(internalUserId)`
   once per identity transition. Do not identify with email.
4. Server-side errors use the authenticated internal user ID when the session
   is already verified; otherwise use request ID and, if available, the
   browser-provided anonymous ID only after strict validation.
5. Never trust a client user ID for authorization or overwrite the server user
   ID. Never log cookies, authorization headers, passwords, tokens, form
   values, or database connection strings.
6. Sanitize URLs: retain route template, not query strings or callback URLs.
7. Document retention, access, consent, and deletion behavior before enabling
   production PostHog capture.

## Detailed flow: authenticated Web Server Action failure

Example: `toggleWorkoutFavorite(workoutId)` hits a transient database failure.

```ts
export async function toggleWorkoutFavorite(workoutId: string) {
  const context = await createActionContext('workout.favorite.toggle');

  try {
    const userId = await requireUser();
    const result = await toggleFavorite({ userId, workoutId });
    revalidatePath('/home');
    revalidatePath('/favourites');
    revalidatePath(`/workouts/${result.workoutSlug}`);
    return { ok: true as const, data: result };
  } catch (error) {
    if (isFrameworkControlFlow(error)) throw error;

    const classified = classifyError(error, context);
    if (!classified.reportable) {
      return toActionFailure(classified);
    }

    await reportOnce(classified, context);
    throw error; // framework boundary renders generic recovery UI
  }
}
```

Runtime behavior:

1. Input/auth/domain code throws a typed error or an infrastructure error.
2. The action boundary preserves redirects and maps expected errors.
3. Classifier turns a DB/network error into `DEPENDENCY_UNAVAILABLE` or
   `INTERNAL_ERROR`, with `retryable` determined by operation safety.
4. Reporter emits one structured event containing release, route, operation,
   request ID, trace ID, user ID (if verified), fingerprint, and cause metadata.
5. PostHog adapter captures a sanitized exception/event asynchronously and never
   causes the user request to fail if telemetry is unavailable.
6. UI displays “Something went wrong. Please try again.” with retry only where
   the mutation is idempotent/safe; the user never sees the DB error.

## API response contract

All versioned API routes should converge on:

```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Workout not found",
    "requestId": "req_123"
  }
}
```

Success payloads remain backward-compatible. Include `x-request-id` in every
response. Do not return `details`, stack, provider codes, or database messages
unless an explicitly allowlisted public detail is required.

## Engineer convention

- Throw typed domain errors for expected domain outcomes; do not throw generic
  `Error` for validation, auth, not-found, or conflict conditions.
- Add `cause` when wrapping an infrastructure error; preserve the original
  error for diagnostics.
- Do not catch an error merely to log and rethrow. Report at one boundary.
- Never use `console.error` in application request paths; use a child logger
  with `service`, `route`, `operation`, `requestId`, and `release`.
- Use stable error codes, not message matching.
- Use route templates and operation names, not raw URLs or form payloads.
- Every new boundary must define expected mappings, generic unexpected UI,
  retry policy, request ID propagation, and tests for no-secret leakage.
- Expected errors are not exceptions in dashboards. They may be counted as
  metrics/events, but they do not page.
- Telemetry is best-effort: reporter failures are logged once and must not mask
  the original application result.
- A retry button is allowed only when the operation is safe or explicitly
  designed for retry; avoid retry storms and duplicate mutations.

## Implementation tasks

### Task 1 — Freeze contracts and remove documentation drift

- [ ] Reconcile `docs/OBSERVABILITY.md`, app architecture docs, and package
      README with actual logger/health APIs.
- [ ] Document service names: `web`, `admin`, `core` (if emitted), and runtime
      environment/release fields.
- [ ] Add the error code/category/status/retry/reportability contract and the
      API envelope to the documentation.
- [ ] Define PostHog privacy, retention, consent, and ownership decisions.

### Task 2 — Build the shared error contract

- [ ] Extend `packages/core`/shared errors with stable codes and safe messages.
- [ ] Separate `AUTH_REQUIRED` from `ADMIN_REQUIRED`.
- [ ] Add `ConflictError`, `DependencyError`, and `InternalError` factories as
      needed, with `cause` support and `ErrorOptions`.
- [ ] Implement `normalizeError`, `classifyError`, `toPublicError`, and
      framework-control-flow guards with unit tests.
- [ ] Implement a strict allowlist sanitizer and deterministic fingerprinting.

### Task 3 — Complete observability runtime primitives

- [ ] Add request context validation/generation and response header helpers.
- [ ] Add release, deployment environment, route template, operation, and
      runtime metadata to structured events.
- [ ] Add `reportOnce`/dedupe semantics and bounded sampling/rate limiting.
- [ ] Make reporter failures non-throwing and observable through a fallback
      logger.
- [ ] Add tests for nested redaction, URL sanitization, fingerprints, duplicate
      suppression, and telemetry failure isolation.

### Task 4 — Wire Next.js Web boundaries

- [ ] Add a server-side boundary/helper for Route Handlers and apply it to the
      like route and future API routes.
- [ ] Update `app/error.tsx` and add/verify `global-error.tsx` behavior with
      generic copy, retry, request ID support where available, and reporting.
- [ ] Standardize Server Action result/error handling while preserving Next
      redirect control flow.
- [ ] Cover login/register/onboarding/workout action paths and ensure expected
      failures are not reported as internal errors.
- [ ] Add response `x-request-id` and safe JSON contract tests.

### Task 5 — Wire TanStack Admin boundaries

- [ ] Wrap server functions with the shared classifier/context/reporting helper.
- [ ] Add root and route-level error reporting without duplicate reports from
      Query + Router layers.
- [ ] Introduce a typed admin error UI model with resource, request ID, and
      retryability; retain generic user-facing copy.
- [ ] Test unauthenticated/forbidden/validation/not-found/unexpected paths.

### Task 6 — Add PostHog adapters and identity lifecycle

- [ ] Add the browser PostHog client/provider behind a feature flag and runtime
      environment guard.
- [ ] Add server capture through the supported PostHog Node/API path without
      exposing project secrets to the browser.
- [ ] Implement anonymous capture, post-login `identify(internalUserId)`, and
      logout/reset behavior according to the verified SDK contract.
- [ ] Send only allowlisted error properties: code, category, service, route,
      operation, release, environment, request ID, trace ID, fingerprint, and
      retryable/severity flags.
- [ ] Add integration tests with a fake PostHog adapter; no network calls in
      unit tests.

### Task 7 — Alert-noise controls and operational readiness

- [ ] Define dashboard queries and alert thresholds using rates/windows rather
      than raw event counts.
- [ ] Add health/readiness dependency timeout behavior and distinguish liveness
      from dependency health.
- [ ] Define alert ownership, severity, escalation, release correlation, and
      runbook links.
- [ ] Run a production-like error matrix to verify 4xx outcomes do not page,
      repeated identical defects group, and reporter outages do not break traffic.

### Task 8 — Verification and rollout

- [ ] Unit-test contract/classifier/sanitizer/fingerprint behavior.
- [ ] Integration-test Web Route Handler and Server Action mappings.
- [ ] Integration-test Admin server-function and route/query mappings.
- [ ] Add E2E checks for generic UI, retry behavior, request IDs, and no leaked
      credentials/provider details.
- [ ] Roll out logs and dashboards first, then PostHog capture behind a flag,
      then enable alerts after baseline volume is known.
- [ ] Run `pnpm lint`, `pnpm check-types`, `pnpm test`, targeted E2E, and build
      checks for both deployable apps.

## Implementation status — 2026-09-17

Status is based on repository code and local verification. `partial` means the
primitive or first boundary exists but the complete production wiring or
external operational verification is still outstanding.

| Task                           | Status  | Evidence / remaining work                                                                                                                                                           |
| ------------------------------ | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Contracts and documentation | done    | Convention, service names, privacy guidance, alert policy, dashboards, and runbooks are documented. Production retention/access owners still need real team values.                 |
| 2. Shared error contract       | done    | Stable domain metadata, authentication/conflict/dependency errors, classifier, library dependency mapping, sanitizer, and fingerprint tests exist.                                  |
| 3. Observability primitives    | partial | DI reporter, request-scope primitive, request/trace validation, timeout, and server PostHog adapter exist. Cross-layer scope propagation and bounded sampling/rate limiting remain. |
| 4. Web boundaries              | partial | API and all current mutation actions use a boundary. Typed expected action results and `global-error.tsx` remain.                                                                   |
| 5. Admin boundaries            | partial | Server-function and route boundaries exist. Query/Router/ErrorScope propagation and complete typed retry metadata remain.                                                           |
| 6. PostHog lifecycle           | partial | Browser/server adapters, feature gates, consent gate, anonymous identity, identify/reset, and allowlists exist. Consent UI/product policy and real project verification remain.     |
| 7. Operational readiness       | partial | Readiness timeout, database check, alert policy, dashboard specification, owner placeholders, and runbook exist. External alert wiring and production baseline remain.              |
| 8. Verification and rollout    | partial | Unit/integration/build gates pass. E2E error matrix is intentionally excluded from this implementation and production rollout is not verified.                                      |

### Verification evidence

- Web: typecheck, lint, and 70 tests pass.
- Admin: typecheck, lint, and 26 tests pass.
- Observability: typecheck, lint, and 29 tests pass.
- Documentation checks and `git diff --check` pass.
- PostHog public key is absent from Web server and Admin server artifacts.
- E2E is a follow-up by explicit scope decision.

## Pros and cons

### Pros

- One error vocabulary across two frameworks and all transport boundaries.
- Domain code stays reusable and vendor-independent.
- Safe public errors become enforceable by type and tests.
- Request/fingerprint correlation makes PostHog and logs useful for diagnosis.
- Explicit classification keeps expected user behavior out of on-call alerts.
- PostHog can connect anonymous browser failures to later authenticated usage.
- A future Sentry/Datadog adapter does not require rewriting features.

### Cons

- More infrastructure code and conventions than direct `try/catch` mapping.
- Framework control-flow exceptions require careful adapters, especially Next
  redirects and not-found behavior.
- Identity stitching increases privacy and retention responsibilities.
- PostHog error capture is not a substitute for availability monitoring or
  structured server logs.
- Fingerprinting/rate limits can hide a real issue if policies are too
  aggressive; dashboards and periodic review are required.
- Two UI frameworks still need separate presentation adapters despite sharing
  the underlying contract.

## Acceptance criteria

- Every unexpected Web/Admin boundary failure is reported at most once per
  request and contains a request ID, service, operation, release, and stable
  fingerprint.
- No password, token, cookie, authorization header, email, raw form input,
  query string, stack trace, or provider/database detail reaches user UI or
  PostHog properties.
- Expected 400/401/403/404 outcomes are safe, typed, test-covered, and do not
  create production error alerts.
- Retry is exposed only for retryable/safe operations.
- Anonymous browser errors are associated with the anonymous PostHog identity;
  after login, later events use the verified internal user ID.
- Disabling PostHog or breaking the telemetry sink does not break Web/Admin
  requests.
- Documentation matches the shipped APIs and includes an owner/runbook for
  every production alert.

## Approval gate

Do not implement until the owner approves this plan and confirms:

- PostHog project/environment ownership and whether consent is required before
  browser capture;
- initial alert destination and on-call owner;
- retention/access policy for internal user IDs and error traces;
- whether the first implementation should include only the existing API/action
  boundaries or also proactively wrap every future boundary with a reusable
  helper.
