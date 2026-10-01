# Landing Publishing Runbook

## Strapi durable publication path

The Strapi migration uses the CMS-owned PostgreSQL outbox. Strapi records
allowlisted post-commit publish/unpublish/delete and media events, then sends a
coalesced HMAC-signed batch to the protected Landing preview deployment. The
Landing receiver validates the raw body, timestamp and delivery ID before
calling the public site's Vercel Deploy Hook. Local development uses the same
outbox worker and receiver with SQLite and localhost.

Configure these values in the CMS and protected Landing preview project:

| Project       | Variable                        | Purpose                                            |
| ------------- | ------------------------------- | -------------------------------------------------- |
| CMS           | `LANDING_PUBLISH_WEBHOOK_URL`   | Exact protected preview webhook URL                |
| CMS + preview | `STRAPI_WEBHOOK_SIGNING_SECRET` | Shared random secret, at least 32 characters       |
| Preview       | `VERCEL_DEPLOY_HOOK_URL`        | Private Deploy Hook for the public Landing project |

Do not configure Strapi's built-in bearer webhook for this path. The outbox
worker claims rows with a lease, waits for five seconds of inactivity and
retries failures with bounded exponential backoff. Check pending/leased rows
and retry timestamps in `cms_publish_outbox` when deliveries stop. Successful
Landing responses mark the batch delivered. If the receiver accepts a request
but its response is lost, a retry can reach another serverless instance and
trigger a duplicate build; durable receiver-side idempotency remains a staging
gate before broad editor access.

## Scope and ownership

This runbook covers the Sanity-to-Vercel publication path for
`apps/landing`. The Landing service maintainer owns the implementation and
initial incident response. Replace this role with a named owner and escalation
contact before production launch.

The public Landing project remains a static Astro deployment. The signed
webhook endpoint exists only in the protected SSR preview/automation project:

```text
Sanity publish
  -> protected preview /api/webhooks/sanity/publish
  -> signed request validation and delivery coalescing
  -> Vercel Deploy Hook for the public Landing project
  -> Sanity-backed static build
  -> atomic Vercel deployment
```

An unavailable CMS can fail a new build but cannot remove the last successful
static deployment.

## Required configuration

Configure these values in Vercel; never store or paste their values into the
repository, issue tracker, screenshots or logs.

| Project            | Variable                              | Purpose                                                                        |
| ------------------ | ------------------------------------- | ------------------------------------------------------------------------------ |
| Preview/automation | `SANITY_WEBHOOK_SECRET`               | Random secret of at least 32 characters, also configured on the Sanity webhook |
| Preview/automation | `VERCEL_DEPLOY_HOOK_URL`              | Complete production Deploy Hook URL for the public Landing project             |
| Public Landing     | `LANDING_OUTPUT=static`               | Keeps production output static                                                 |
| Public Landing     | `LANDING_CONTENT_SOURCE=sanity`       | Builds from the published Sanity perspective                                   |
| Public Landing     | `SANITY_PROJECT_ID`, `SANITY_DATASET` | Non-secret published-content source identifiers                                |

The preview project must keep Vercel Deployment Protection enabled. Create a
dedicated Protection Bypass for Automation secret for Sanity. If the webhook
configuration cannot set the `x-vercel-protection-bypass` header, append the
same key as a query parameter to the webhook URL. Treat that URL as a secret
and rotate the bypass independently from the Sanity signing secret.

Create a Sanity document webhook with:

- URL: the stable protected preview/automation origin plus
  `/api/webhooks/sanity/publish` and the protection bypass when required;
- secret: the same value as `SANITY_WEBHOOK_SECRET`;
- trigger: create, update and delete for the explicitly published Landing
  document types; do not trigger on drafts or versions;
- payload: a small JSON object; the endpoint does not need document content;
- delivery headers: retain Sanity's signature and `idempotency-key` headers.

Sanity signs the raw body and the endpoint validates the timestamp within five
minutes. Requests larger than 64 KiB, malformed JSON, unsafe delivery keys and
invalid or stale signatures are rejected before the Deploy Hook is called.

## Activation checklist

1. Run `pnpm check:landing-content-parity` against the intended dataset.
2. Run `pnpm check:landing-indexing` and the Landing test/build gates.
3. Deploy the preview/automation project with the two server-only secrets.
4. Add a Vercel Firewall rate limit for the exact webhook path, sized above
   Sanity's documented single-concurrency delivery behavior but below a level
   that could create a deploy storm. Record the threshold after observing test
   deliveries; do not rate-limit the rest of the preview site by accident.
5. Verify an unsigned request returns `401`, includes `x-request-id` and does
   not create a Vercel deployment.
6. Send a signed Sanity test delivery. Expect `202` with status `accepted`.
7. Replay the same Sanity delivery. Expect `202` with status `duplicate` when
   it reaches the same warm runtime; Vercel remains the authoritative deploy
   deduplication boundary across serverless instances.
8. Confirm the public build uses the published perspective, passes content
   contracts and becomes available without changing the previous deployment.
9. Record publish-to-ready duration. Do not claim the 2–5 minute SLA until
   representative measurements pass.

The provider-neutral normalizer in
`apps/landing/src/operations/publish-ready-signal.ts` is the only approved path
from correlated completion evidence to the `publish.ready` observation. A
terminal provider state is insufficient by itself: content-contract, static
build, artifact-budget and security-policy evidence must all pass. The future
transport must authenticate Vercel, correlate exactly one accepted publish to
one completion and then discard provider payloads before calling the normalizer.

## Response and alert policy

Grouped thresholds, provisional SLOs and activation gates are defined in the
[Landing service-level runbook](LANDING_SERVICE_LEVELS.md). The table below
describes per-request handling; it must not be translated into one page per
response.

| Result                       | Meaning                                           | Action                                                                           |
| ---------------------------- | ------------------------------------------------- | -------------------------------------------------------------------------------- |
| `202 accepted`               | Deploy Hook accepted a new request                | Observe the Vercel build                                                         |
| `202 duplicate`              | Runtime already accepted the delivery key         | No alert; verify provider deduplication if no build exists                       |
| `400 INPUT_INVALID`          | Invalid body or idempotency key                   | Fix Sanity webhook projection/configuration; no page                             |
| `401 AUTH_REQUIRED`          | Missing, invalid or stale signature               | Check secret/timestamp; investigate repeated failures without paging per request |
| `503 CONFIG_INVALID`         | Required server configuration is absent or unsafe | Stop activation and repair Vercel configuration                                  |
| `503 DEPENDENCY_UNAVAILABLE` | Deploy Hook timed out or rejected the request     | Sanity may retry; check Vercel status and deploy-hook validity                   |
| `500 INTERNAL_ERROR`         | Unexpected handler defect                         | Use `x-request-id`, fingerprint and release to investigate                       |

Telemetry must contain only the stable service, route, operation, environment,
release, request ID, error code and fingerprint fields. Never record the body,
signature, authorization/bypass values, Deploy Hook URL, cookies, document ID
or raw headers.

## Failed build and rollback

1. Do not redirect the production domain to a failed or incomplete deployment.
   The last successful static deployment remains live.
2. Inspect the failed build for stable contract issue codes. Do not copy CMS
   payloads or tokens into incident chat.
3. Correct or revert the Sanity document, then publish again to trigger a new
   atomic build.
4. If a bad deployment is already live, use Vercel's deployment history to
   promote the last known-good production deployment.
5. Verify Home, affected routes, canonical/robots/sitemap output and member-app
   CTAs after rollback.

## Emergency unpublish

1. Unpublish or revert the affected Sanity document. Do not delete it until the
   redirect/retention decision is recorded.
2. Trigger a rebuild and verify the route is absent from the sitemap and static
   route inventory.
3. For an Article or Category, expect a real `404` after removal. Campaign
   expiry remains blocked until Product/Content approves `410`, redirect or
   archived-canonical behavior.
4. If rebuild automation is unavailable, manually invoke the existing Vercel
   Deploy Hook from an authorized environment or redeploy the production branch.
5. Rotate the Sanity signing secret, Vercel Deploy Hook and automation bypass
   independently if any value may have leaked.

## Broken-link check

Before promotion and after emergency removal, crawl the generated artifact and
compare route, status, canonical and sitemap maps. A scheduled external
broken-link job remains Phase 7 work; until then this is a release checklist
item owned by the Landing maintainer.

## Sanity path limitation

The legacy Sanity path uses an in-process delivery store and remains an MVP
cross-instance limitation. The Strapi migration uses the durable CMS outbox
described above; it still needs a durable receiver-side idempotency store to
eliminate duplicate Deploy Hook calls across separate serverless instances.
