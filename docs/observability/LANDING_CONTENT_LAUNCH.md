# Landing Content Launch Readiness

This gate verifies that requested Campaign, Pricing or analytics-consent
surfaces agree with the validated published-content snapshot and target
configuration. It does not publish content, activate routes, enable indexing,
enable analytics or replace human approval of offers, legal copy and assets.

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

Analytics consent is an explicit, independent scope and is not part of the
default Campaign/Pricing check:

```sh
LANDING_ANALYTICS_ENABLED=true \
LANDING_POSTHOG_KEY=<public-project-key> \
LANDING_EXPERIMENTS_ENABLED=false \
pnpm check:landing-launch-readiness -- --require=analytics-consent
```

Run that command with the exact target environment. The browser project key is
required by environment validation but is never printed. It is public client
configuration, not a personal or server API token.

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
- `error:analytics_disabled:analytics` — analytics is not enabled in the target
  configuration being assessed.
- `error:consent_copy_missing:siteShell.analyticsConsent` — no complete,
  validated consent contract is published in Site Settings.
- `error:privacy_page_missing:siteShell.analyticsConsent.privacyLink` — the
  privacy link does not exactly match the canonical path of a published Generic
  Legal Page.
- `error:experiments_not_approved:experiments` — experiments are enabled before
  the separate experiment brief/reporting/A/A gates have passed.
- `error:launch_readiness_arguments_invalid:arguments` — the requested surface
  selection is unsupported or empty.
- `error:landing_launch_readiness_failed:repository` — configuration, provider
  or content-contract loading failed; provider details are intentionally hidden.

Warnings exit successfully. Errors exit non-zero. A Pricing pass inherits the
existing contract checks for currency exponent/locale, plan IDs, exact minor
amounts, billing cadence, entitlement keys, CTA actions, FAQ and mandatory
cancellation/refund text. A Campaign pass inherits schema/version, media, SEO,
schedule, expiry and section-registry validation.

An analytics-consent pass proves configuration/content agreement only. Legal
must still approve the exact consent and privacy copy; PostHog reporting and a
live A/A test remain separate gates. Keep `LANDING_EXPERIMENTS_ENABLED=false`
until those gates are recorded.

## Release sequence

1. Content/Marketing records approval for offer, copy, schedule and assets.
2. Publish the reviewed Sanity documents.
3. Run the scoped gate against the intended published dataset.
4. Resolve all errors and explicitly review warnings.
5. Run the existing content parity/operational checks appropriate to the release.
6. Activate the route/navigation/indexing change in a separate reviewed commit.
7. Use the rollout runbook for deployment, crawl and rollback evidence.

For analytics activation, Legal first approves and Content publishes both Site
Settings consent copy and the matching Generic Legal Page. Then run the
`analytics-consent` scope against that published dataset with the exact target
analytics configuration. Enable deployment only after the command passes;
experiment activation remains out of scope.

The gate is evidence for step 3 only. It must not be interpreted as legal,
commercial, accessibility or production rollout approval.
