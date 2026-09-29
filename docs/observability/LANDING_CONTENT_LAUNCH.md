# Landing Content Launch Readiness

This gate verifies that requested Campaign and Pricing surfaces exist in the
validated published-content snapshot and are eligible for public launch. It
does not publish content, activate routes, enable indexing or replace human
approval of offers, legal copy and assets.

## Run the gate

The default requires both Campaign and Pricing:

```sh
pnpm check:landing-launch-readiness
```

The local fixtures intentionally contain no Campaign or Pricing content, so the
default fixture command fails with stable missing-readiness codes. Gate one
surface independently when releases are separate:

```sh
pnpm check:landing-launch-readiness -- --require=campaign
pnpm check:landing-launch-readiness -- --require=pricing
```

To assess the public published Sanity dataset, provide existing non-secret
source configuration:

```sh
LANDING_CONTENT_SOURCE=sanity \
SANITY_PROJECT_ID=<project-id> \
SANITY_DATASET=production \
pnpm check:landing-launch-readiness
```

No Sanity token is accepted by this command. A private dataset needs a separate
reviewed design rather than placing a read token in release output.

## Policy and output

Output is limited to `severity:code:path`:

- `error:campaign_not_active:campaigns` — no validated Campaign is active at
  the evaluation time. Scheduled, archived, redirected and gone campaigns do
  not satisfy launch eligibility.
- `warning:campaign_ending_soon:campaigns.<slug>` — the active Campaign ends
  within seven days; confirm the launch window and expiry behavior.
- `error:pricing_missing:pricing` — the validated published Pricing singleton
  is absent.
- `error:launch_readiness_arguments_invalid:arguments` — the requested surface
  selection is unsupported or empty.
- `error:landing_launch_readiness_failed:repository` — configuration, provider
  or content-contract loading failed; provider details are intentionally hidden.

Warnings exit successfully. Errors exit non-zero. A Pricing pass inherits the
existing contract checks for currency exponent/locale, plan IDs, exact minor
amounts, billing cadence, entitlement keys, CTA actions, FAQ and mandatory
cancellation/refund text. A Campaign pass inherits schema/version, media, SEO,
schedule, expiry and section-registry validation.

## Release sequence

1. Content/Marketing records approval for offer, copy, schedule and assets.
2. Publish the reviewed Sanity documents.
3. Run the scoped gate against the intended published dataset.
4. Resolve all errors and explicitly review warnings.
5. Run the existing content parity/operational checks appropriate to the release.
6. Activate the route/navigation/indexing change in a separate reviewed commit.
7. Use the rollout runbook for deployment, crawl and rollback evidence.

The gate is evidence for step 3 only. It must not be interpreted as legal,
commercial, accessibility or production rollout approval.
