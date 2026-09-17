# Observability Dashboards

Create these views in the configured telemetry platform. All views filter by
`service`, `environment`, and `release`.

- Error rate: reportable errors divided by requests, grouped by `fingerprint`
  and `operation`.
- Expected outcomes: `INPUT_INVALID`, `AUTH_REQUIRED`, `ADMIN_REQUIRED`,
  `RESOURCE_NOT_FOUND`, and `RESOURCE_CONFLICT`; dashboard only.
- Dependency health: readiness status and check duration by dependency.
- Release correlation: first-seen fingerprint versus deployment/release.
- Telemetry health: reporter failures and capture latency.

Suggested owners: `web-maintainer` for Web/API and `admin-maintainer` for
Admin/server functions. Replace placeholders with team aliases before paging
is enabled.
