# Landing Operational Audit Runbook

The Landing operational audit checks published-content contracts without
crawling a deployment. It reports broken internal links, Campaign lifecycle
maintenance and experiment expiry/cleanup from a deterministic clock.

## Run locally

The safe default audits reviewed fixtures and requires no credentials:

```sh
pnpm check:landing-operations
```

To audit the public published Sanity dataset, provide only non-secret
configuration:

```sh
LANDING_CONTENT_SOURCE=sanity \
SANITY_PROJECT_ID=<project-id> \
SANITY_DATASET=production \
pnpm check:landing-operations
```

This path intentionally has no Sanity read token. Keep the workflow on fixtures
if the published dataset is private; introducing a secret-bearing audit requires
a separate security review.

## Scheduled workflow

`.github/workflows/landing-operations.yml` runs daily and can also be dispatched
manually. It starts in fixture mode. To activate public Sanity checks, configure
these GitHub repository Variables (not Secrets):

- `LANDING_AUDIT_CONTENT_SOURCE=sanity`
- `SANITY_PROJECT_ID=<project-id>`
- `SANITY_DATASET=production` (optional; this is the default)

The job has read-only repository permissions, one concurrency group and a
ten-minute timeout. It does not mutate content, create issues or send alerts.

## Interpret results

Output is deliberately bounded to `severity:code:path`; content copy, provider
errors, URLs and secrets are excluded.

- `error:broken_internal_link:*` — update or remove the source link, or publish
  its intended target.
- `error:broken_campaign_redirect:*` — set the Campaign successor to a
  published path before expiry.
- `warning:redirected_internal_link:*` — replace the authored link with its
  final destination.
- `warning:campaign_expiring_soon:*` — review an active Campaign ending within
  seven days.
- `warning:campaign_archive_stale:*` — review an archived Campaign more than
  30 days after its end.
- `warning:experiment_expiring_soon:*` — decide whether to stop or replace the
  experiment before its end date.
- `error:experiment_expired_enabled:*` — disable the expired experiment.
- `error:experiment_cleanup_overdue:*` — remove the experiment code and registry
  entry after its cleanup date.

Warnings are maintenance signals and exit successfully. Errors fail the command
and the scheduled job. Re-run the local command after correcting content or the
compiled experiment registry. A repository/configuration failure emits only
`error:landing_operational_audit_failed:repository`; inspect the workflow run and
configuration without pasting credentials into logs or tickets.

## Ownership and limits

Landing engineering owns the audit policy and workflow. Content/Marketing owns
Campaign and authored-link remediation; Growth owns experiment expiry and
cleanup. This audit complements, but does not replace, live crawl, CWV, webhook
SLO or analytics-result monitoring in later Phase 6–7 work.
