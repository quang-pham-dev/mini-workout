# Observability Architecture

## Scope

Observability is a shared platform capability. Product features should emit
consistent signals without coupling the application to a vendor such as Sentry,
Datadog, or a hosted metrics provider.

The provider-agnostic primitives live in `@mini-workout/observability`:

- structured logs with service and request context;
- safe error normalization and error-reporter contracts;
- request IDs and trace context helpers;
- Web Vitals metric contracts;
- health-check orchestration;
- alert payload and sink contracts.

Vendor adapters may be added later under the application or a dedicated
integration package. The shared package must not contain vendor credentials,
network calls, or application-specific business logic.

## Logging rules

- Use `createLogger({ service })` instead of ad hoc `console.log` in server
  code.
- Emit structured context such as `requestId`, route, operation, and entity ID.
- Never log passwords, tokens, cookies, authorization headers, API keys, or raw
  user secrets. The shared logger redacts common sensitive keys by default.
- Keep messages stable and actionable; do not use logs as a database.
- Do not log full request or response bodies unless the data is explicitly
  classified as safe.

## Error tracking rules

- Report unexpected errors through `ErrorReporter`.
- Return safe, user-facing error messages; keep stack traces in the server-side
  error system only.
- Add request and trace context to reports.
- Expected validation and not-found outcomes are not unhandled exceptions.

## Request tracing

Every HTTP boundary should preserve or create an `x-request-id`. If an upstream
`traceparent` exists, preserve its trace identifiers. Downstream calls should
forward the request ID and trace context when the integration supports it.

## Web Vitals

The web app should report CLS, FCP, INP, LCP, and TTFB through the shared
`WebVitalMetric` contract. The destination is intentionally configured by the
web app so product analytics and privacy requirements can be decided separately.

## Health and uptime

Health is split by operational meaning:

- `/api/health/live` is liveness. It performs no dependency I/O and returns 200
  when the route is reachable.
- `/api/health/ready` is readiness. It calls the database package's bounded
  `pingDatabase()` probe and returns 503 when the application is not ready.
- `/api/health` is a compatibility alias to readiness for existing monitors.

Do not make health checks perform mutations or expensive queries. Health route
modules consume `getObservability()` from app instrumentation; they must not
create a second module-scope logger.

Uptime monitoring should call the endpoint from outside the deployment region.
Alerting thresholds and escalation policy belong to deployment documentation,
not UI components.

## Required project integration

Each deployable app must document its logger service name, error-reporting
integration, request ID propagation, Web Vitals destination, health endpoint,
uptime monitor, and alert owners.
