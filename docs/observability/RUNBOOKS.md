# Observability Runbooks

## Internal error spike

1. Open the grouped fingerprint and identify first/last release.
2. Search logs using the representative `requestId`.
3. Compare affected route/operation and deployment timestamp.
4. Roll back or disable the owning feature flag if impact is active.
5. Add a regression test and link the incident before resolving the alert.

## Dependency unavailable

1. Check readiness status and dependency duration.
2. Confirm provider/database status and connection pool saturation.
3. Keep liveness separate from readiness; do not restart healthy instances
   solely because an optional dependency is degraded.
4. Enable the documented fallback or rollback.

## Telemetry outage

Telemetry is best-effort. Disable the PostHog flag if it causes client or server
latency. Product traffic must continue when PostHog is unavailable.

## Ownership

Until a formal on-call rotation exists, owners are `web-maintainer` and
`admin-maintainer`. Production deployments must replace these placeholders with
team aliases and links to the incident system.
