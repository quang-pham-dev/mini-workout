# Landing Service-Level Policy

**Status:** In progress
**Date:** 2026-09-29
**Owner:** `apps/landing`

## User journey

As the Landing service owner, I want editor preview and publishing health to be
evaluated from bounded operational outcomes so that actionable incidents are
detected without paging on individual editor mistakes, retries or duplicates.

## Scope

- a pure policy over sanitized preview, publish-webhook and deployment-ready
  observations;
- provisional 28-day SLO indicators with explicit insufficient-data state;
- immediate configuration incident and grouped dependency/internal failure
  incidents across consecutive windows;
- publish-to-ready latency evaluation against the existing five-minute target;
- stable incident codes, ownership and runbook references;
- tests and operator documentation.

Excluded:

- telemetry-provider SDKs, dashboards, paging destinations and credentials;
- a new Vercel callback or durable event store;
- claims about production SLO compliance before representative observations;
- changes to the current public deployment or live verification.

## Decisions

1. The policy belongs to `apps/landing/src/operations`; these operations and
   thresholds are Landing-specific rather than generic observability types.
2. Observations contain only timestamp, operation, stable outcome and bounded
   duration. They cannot carry URLs, document IDs, content, headers or secrets.
3. Expected authentication/input rejections and duplicate webhook deliveries
   are excluded from availability denominators and never alert.
4. Configuration failures create an immediate critical incident. Dependency or
   internal failures require at least five events in each of two consecutive
   five-minute windows before becoming critical.
5. Preview and webhook availability target 99% over 28 days. Publish-to-ready
   targets 95% within five minutes. Each indicator requires 20 eligible samples
   before it can report pass/breach; otherwise it is `insufficient_data`.
6. Slow/failed deployments create a warning only after two consecutive eligible
   breaches because the previous static deployment remains available.

## Acceptance criteria

1. Expected/editor-caused outcomes do not reduce availability or create an
   incident.
2. SLO output is deterministic from injected observations and clock.
3. Low-volume data reports `insufficient_data`, never a false pass.
4. Configuration and consecutive grouped failures produce stable incidents.
5. Publish latency uses the five-minute objective and two-consecutive-breach
   noise control.
6. Invalid timestamps, durations and future observations fail closed.

## Verification

- focused policy tests;
- Landing lint, type-check and coverage;
- docs check and static build/budget regression;
- maintainer review against `docs/ERROR_HANDLING_CONVENTION.md`.
