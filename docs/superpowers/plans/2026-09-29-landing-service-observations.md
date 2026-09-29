# Landing Service Observation Adapters

**Status:** In progress
**Date:** 2026-09-29
**Owner:** `apps/landing`

## Goal

Emit sanitized, best-effort observations from the existing preview-enable and
publish-webhook boundaries so the Phase 7 service-level policy has real runtime
inputs without coupling feature code to a telemetry vendor.

## Scope

- a Landing-owned observation-recorder interface and logger adapter;
- preview success, expected rejection, configuration and dependency outcomes;
- publish accepted, duplicate, expected rejection, configuration, dependency
  and internal outcomes;
- bounded duration and injected clock;
- request-ID propagation and report-once behavior for preview failures;
- tests for allowlisted payloads, telemetry failure isolation and no duplicate
  error reporting.

Excluded:

- Vercel deployment-completion callback and `publish.ready` observations;
- persistent storage, dashboards, alert delivery or PostHog;
- document identity, URLs, request bodies, headers or secrets;
- live environment verification.

## Design

The boundaries depend on a narrow `LandingServiceObservationRecorder`. The
logger adapter emits one stable info event whose context is exactly the policy
observation contract. Recorder failures are swallowed at the boundary so
telemetry cannot change preview or webhook responses. Existing error reporting
remains the single source for actionable exception detail and request IDs.

## Acceptance criteria

1. Every preview-enable and publish-webhook response emits exactly one bounded
   observation when a recorder is configured.
2. Expected authentication/input/duplicate outcomes are observed but never
   reported as exceptions.
3. Configuration, dependency and internal failures are reported once and mapped
   to the policy outcome without provider details.
4. Reporter or recorder failure cannot alter the original response.
5. Preview responses preserve private/no-store/noindex and add `x-request-id`.
6. No new dependency, environment variable or external write is introduced.
