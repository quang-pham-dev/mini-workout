# Landing Preview And Publishing Service Levels

This runbook defines the provisional service-level policy for editor preview and
content publishing. It is policy-as-code in
`apps/landing/src/operations/service-level-policy.ts`; it does not claim that
production currently meets an SLO and does not configure a paging provider.
Preview-enable and publish-webhook boundaries now emit the allowlisted
observations through the service logger. Publish-to-ready collection remains
inactive until an authenticated deployment-completion boundary is approved.

## Indicators and objectives

| Indicator                    | Eligible outcomes                                         | Objective                         |
| ---------------------------- | --------------------------------------------------------- | --------------------------------- |
| Editor preview availability  | Success, configuration, dependency and internal outcomes  | 99% over 28 days                  |
| Publish webhook availability | Accepted, configuration, dependency and internal outcomes | 99% over 28 days                  |
| Publish-to-ready             | Ready or failed production deployment attempts            | 95% ready within five minutes/28d |

Each indicator needs at least 20 eligible observations. Below that threshold it
must report `insufficient_data`, never pass. The thresholds are initial policy
values and require recalibration after a representative production baseline.

Expected editor or delivery behavior is excluded from availability:

- invalid preview authorization;
- invalid webhook input or authentication;
- duplicate/coalesced webhook delivery.

These outcomes may appear in a security or configuration dashboard, but they do
not page Landing engineering individually.

## Observation contract

An observation contains only:

- ISO timestamp;
- stable operation (`preview.enable`, `publish.webhook`, `publish.ready`);
- allowlisted outcome;
- bounded duration in milliseconds when evaluating publish-to-ready.

Never attach a preview URL, Sanity document ID/content, Deploy Hook URL,
signature, token, cookie, header, query string, email or request body. Provider
adapters must normalize to this contract before storage or evaluation.

## Incident policy

| Incident code                      | Severity | Trigger                                                                  |
| ---------------------------------- | -------- | ------------------------------------------------------------------------ |
| `landing_configuration_invalid`    | Critical | A configuration failure in the current five-minute window                |
| `landing_preview_failures`         | Critical | At least five dependency/internal failures in two consecutive 5m windows |
| `landing_publish_webhook_failures` | Critical | At least five dependency/internal failures in two consecutive 5m windows |
| `landing_publish_to_ready_slow`    | Warning  | The two latest deployment outcomes both fail or exceed five minutes      |

The unit of alerting is the grouped incident code, environment and release—not
an individual observation. Configuration failures bypass sampling. Expected
4xx outcomes, duplicates and a single failed deployment never page.

## Triage

1. Confirm environment and release, then identify the affected operation from
   the stable incident code. Do not paste payloads or credentials into chat.
2. For configuration, stop activation and validate the environment checklist in
   [the publishing runbook](LANDING_PUBLISHING_RUNBOOK.md).
3. For preview failures, verify Sanity availability, project/dataset settings,
   deployment protection and the protected preview runtime.
4. For webhook failures, use the representative request ID from the existing
   error report and check Vercel status/deploy-hook validity. Do not alert again
   from the browser, router or retry layer.
5. For publish-to-ready warnings, inspect the two deployments. The last known
   good static deployment remains authoritative; follow rollback if bad output
   was promoted.
6. Record first/last seen, affected count and resolution. Add a regression test
   before closing a code-caused incident.

## Activation gate

Before connecting a telemetry or paging provider:

1. verify the existing preview/webhook log adapter emits only the observation
   allowlist in the target environment;
2. add and security-review the missing publish-to-ready completion signal;
3. prove success and failure lifecycle correlation without document identity;
4. collect a non-paging staging baseline;
5. validate provider aggregation against the pure policy tests;
6. assign an on-call destination and review thresholds with Content/Growth;
7. explicitly enable alerts—do not infer activation from logging alone.

A Vercel deployment-completion callback or durable observation store is a new
authenticated boundary and requires its own design/security review.
