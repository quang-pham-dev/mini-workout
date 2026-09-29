# Landing Experiment Brief and Reporting Runbook

Landing experiments are compiled, consent-gated enhancements to a complete
static control. Sanity does not own allocation, metrics, approvals or stopping
rules. No experiment may be activated from this document alone.

## Readiness command

Run the offline contract gate after changing either compiled registry:

```sh
pnpm check:landing-experiments
```

The current production registries are both empty, so the command passes without
activating anything. When a definition is enabled, it fails unless a brief with
the same ID/version is fully approved, its registry metadata matches exactly
and its reporting contract is marked verified.

Stable failure output is limited to `severity:code:path`:

- `experiment_brief_missing` — enabled definition has no matching brief.
- `experiment_brief_not_approved` — Product, Data and Legal approval is not
  complete.
- `experiment_report_not_verified` — the reporting view has not passed its
  pre-launch verification.
- `experiment_brief_registry_mismatch` — owner, hypothesis, mode, metrics or
  stopping rule drifted between definition and brief.
- `experiment_definition_missing` — an approved brief has no compiled
  definition and should be removed or restored.
- `experiment_readiness_invalid` — a registry contract itself is invalid;
  implementation details are intentionally hidden.

## Brief contract

Every brief records one versioned experiment, a primary metric, at least one
guardrail, sample/runtime bounds, a stopping rule and explicit Product/Data/Legal
approval. Metrics may use only the existing bounded `cta_clicked` and
`content_engaged` outcomes. Arbitrary events or properties are rejected.

The reporting contract is intentionally fixed:

- denominator: first visible `experiment_exposure` per anonymous subject,
  experiment version and variant;
- numerator: first matching outcome after exposure and within the metric's
  1–168 hour attribution window;
- statistic: unique consented-anonymous-subject conversion rate;
- assignment and analysis remain anonymous and are refreshed daily in UTC;
- no email, account ID, signup identity, raw URL, query string or cross-domain
  token may be introduced into the join.

The conceptual `anonymous_subject` join key maps to the analytics provider's
consent-scoped anonymous identity. It is not accepted as a custom event
property and must never be exported as PII.

## Report verification checklist

Before marking `reporting.status` as `verified`, Data must record evidence that:

1. Exposure, primary and guardrail events use the same experiment ID/version
   and variant vocabulary.
2. Outcomes before exposure, outside the attribution window, without consent or
   with multiple variants are excluded.
3. Unique-subject deduplication prevents repeated clicks/exposures from
   inflating conversion.
4. Variant counts, missing joins, duplicate exposures and sample-ratio mismatch
   are visible as data-quality diagnostics.
5. The report contains no individual signup/account join and access follows the
   approved analytics retention policy.
6. A seeded non-production dataset produces the expected denominator,
   numerator and guardrail result for every variant.

`reportKey` is a stable internal identifier for that verified view; it is not a
URL or provider credential.

## Activation sequence

1. Product drafts the hypothesis, mode, owner and decision rule.
2. Data defines reportable primary/guardrail outcomes, sample/runtime bounds and
   implements the report using the fixed join semantics.
3. Legal confirms the consent/privacy scope; Product, Data and Legal approve the
   exact brief.
4. Data completes the verification checklist and marks the report verified.
5. Add the matching disabled registry definition and run unit, build and
   readiness gates.
6. Schedule and enable an A/A definition, then explicitly enable the environment
   kill switch only for the approved target.
7. Validate live allocation, deduplication, joins, latency and guardrails. Stop
   on data-quality failure; do not interpret an A/A result as product lift.
8. Only after A/A sign-off may a separately approved A/B brief be enabled.
9. Disable, decide and clean up by the compiled lifecycle dates.

Keep `LANDING_EXPERIMENTS_ENABLED=false` whenever these gates are incomplete.
The environment switch is a kill switch, not approval evidence.
