# Landing Experiment Brief and Reporting Contract

**Status:** In progress
**Date:** 2026-09-29
**Owner:** `apps/landing`

## Goal

Close the offline Phase 5 contract gap between the compiled experiment registry
and an experiment that Product/Data/Legal can safely approve and report. No A/A
or A/B experiment is activated by this work.

## Scope

- A versioned, compiled Experiment Brief contract linked to one experiment ID
  and version.
- Typed primary and guardrail metrics limited to outcomes already supported by
  the provider-neutral product-event vocabulary.
- A reporting contract with fixed exposure/join semantics, explicit report
  verification state and bounded attribution windows.
- A pure readiness assessor that rejects missing/unapproved briefs, registry
  drift, unverified reporting and approved orphan briefs.
- An empty production brief registry and an operator-facing activation runbook.

Out of scope: creating a real experiment, changing event payloads, configuring
PostHog, claiming statistical validity, activating `LANDING_EXPERIMENTS_ENABLED`
or executing the live A/A validation.

## Decisions

1. `apps/landing` owns briefs because they are coupled to Landing route,
   experience and registry policy. `packages/analytics` continues to own event
   vocabulary only.
2. Briefs remain compiled and reviewed with code. Sanity must not control
   allocation, metrics, approvals or stopping rules.
3. Supported outcomes are bounded `cta_clicked` and `content_engaged` events.
   Every report uses `experiment_exposure` as denominator and joins by anonymous
   provider subject, experiment version and variant; no signup identity join is
   permitted.
4. Approval and report verification are separate gates. An approved brief with
   an unverified report is not activation-ready.
5. Registry metadata must exactly match the approved brief. Drift fails closed
   rather than silently changing the analysis plan.
6. The production brief registry stays empty until a real A/A brief has human
   approval and a verified reporting view.

## Acceptance criteria

1. Invalid identifiers, metric shapes, sample/runtime bounds, approval states,
   reporting semantics and duplicate identities fail validation.
2. An enabled experiment fails readiness when its brief is missing, not fully
   approved, reporting is unverified or registry metadata differs.
3. A matching enabled experiment and fully approved/verified brief passes.
4. An approved brief without a registry definition is reported as stale.
5. The empty production experiment and brief registries remain valid and do not
   change the public artifact.
6. The runbook separates offline contract evidence, provider report setup and
   live A/A evidence.

## Verification

- RED/GREEN focused unit tests for validation and every readiness state.
- Landing coverage, lint, Astro type-check, static build and artifact budget.
- Documentation and boundary checks.
- No network request, provider mutation, deploy or environment mutation.

## Rollback

Keep the compiled brief registry empty and
`LANDING_EXPERIMENTS_ENABLED=false`. The existing static control and analytics
consent behavior remain unchanged.
