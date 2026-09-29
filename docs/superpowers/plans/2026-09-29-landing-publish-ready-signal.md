# Landing Publish-Ready Signal Aggregation

**Status:** In progress
**Date:** 2026-09-29
**Owner:** `apps/landing`

## Goal

Normalize an authenticated future deployment-completion input into the existing
sanitized `publish.ready` service observation without coupling policy code to
Vercel payloads, credentials or durable storage.

## Scope

- validate accepted/completed lifecycle timestamps and a bounded duration;
- aggregate terminal deployment state with required content, artifact and
  security gates;
- emit only `publish.ready`, `ready|failed`, timestamp and duration;
- record through the existing best-effort observation recorder;
- document the remaining authenticated transport and correlation boundary.

Out of scope: a Vercel webhook endpoint, provider payload parsing, secrets,
durable correlation/storage, dashboards, paging and live verification.

## Decisions

1. A deployment is ready only when its terminal state is `ready` and every
   required gate passed. Missing/not-run evidence fails closed.
2. Duration is measured from the accepted publish signal to terminal completion
   and is bounded to 24 hours. Invalid/future/reversed timestamps fail closed.
3. Output cannot contain deployment IDs, URLs, content identity, provider
   payloads or credentials.
4. Recorder failures remain best-effort and cannot change the caller outcome.
5. The future authenticated adapter must correlate one accepted publish with one
   terminal deployment before calling this contract.

## Acceptance criteria

1. Fully passing terminal evidence emits a sanitized ready observation.
2. Failed deployment or any failed/not-run gate emits a failed observation.
3. Invalid, future, reversed or unbounded timestamps are rejected.
4. Recorder failure is swallowed and no extra input fields reach telemetry.
5. Existing service-level policy consumes the produced observation unchanged.

## Verification

- RED/GREEN focused unit and policy-integration tests.
- Landing coverage, lint, types, static build/budget, docs and boundaries.
- No network, secret, deploy or environment mutation.

## Rollback

Leave the future completion adapter disconnected. Existing preview and publish
webhook observations and the last successful static deployment are unchanged.
