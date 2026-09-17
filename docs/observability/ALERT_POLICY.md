# Observability Alert Policy

This policy applies to `web` and `admin`. Logs and PostHog events are evidence;
the alerting system pages on grouped incidents, never on individual events.

## Initial thresholds

These are staging defaults and must be recalibrated after the first production
baseline:

- `INTERNAL_ERROR`: page after at least 5 events for one fingerprint in 5
  minutes across 2 consecutive windows.
- `DEPENDENCY_UNAVAILABLE`: page when error rate exceeds 1% for 10 minutes or
  readiness fails for 3 consecutive checks.
- `CONFIG_INVALID`: fail startup/deployment and page immediately.
- `INPUT_INVALID`, `AUTH_REQUIRED`, `ADMIN_REQUIRED`, `RESOURCE_NOT_FOUND`,
  and handled `RESOURCE_CONFLICT`: dashboard only.

Every alert includes service, environment, release, route, operation,
fingerprint, first/last seen, affected request count, representative request ID,
owner, and runbook URL. The owner is the service maintainer until an on-call
rotation is assigned.

## Noise controls

- Group by `service + environment + release + fingerprint`.
- Deduplicate within one request using `ErrorScope`.
- Never page from browser, Query, Router, and server reports independently.
- Do not retry telemetry indefinitely.
- Never include credentials, cookies, raw form values, email, query strings, or
  stack traces in PostHog properties.
