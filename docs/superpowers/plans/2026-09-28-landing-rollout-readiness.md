# Landing Rollout Readiness

**Status:** In progress
**Date:** 2026-09-28
**Owner:** `apps/landing`

## Goal

Close the offline portion of Phase 6 without guessing the final custom domain or
changing DNS. Produce one versioned security-header policy, a deployable Vercel
artifact contract and a repeatable crawl/status verifier for preview and
production candidates.

## Scope

- strict public CSP and browser security headers in the Build Output API;
- preview-safe headers that preserve the Sanity framing boundary;
- exact origin derivation from validated environment configuration;
- a rollout verifier for statuses, canonical URLs, robots directives, sitemap
  membership and response headers;
- a parameterized environment/domain matrix and activation/rollback checklist;
- regression tests and deployment commands that require no secret in source.

Excluded:

- DNS, TLS, Vercel alias or Search Console mutation;
- enabling indexing or analytics;
- changing Better Auth/OAuth callbacks without the final approved domains;
- live traffic cutover or deletion of the current root application.

## Security policy

Public HTML defaults to same-origin resources. Sanity CDN images and the
configured PostHog ingestion origin are added only when their features require
them. Inline scripts remain temporarily allowed because the static theme boot
script and per-page JSON-LD are inline; replacing this with build-generated CSP
hashes is a later hardening option. Framing is denied publicly. Preview may be
framed only by the validated Studio origin and remains `noindex`, private and
`no-store`.

HSTS is emitted without `includeSubDomains` or preload because the final root
domain may share Product, Admin and Studio subdomains. Those stronger flags
require coordinated verification across every app.

## Delivery sequence

1. RED tests for public/preview headers, least-privilege analytics origins,
   Build Output route ordering and rollout-report failures.
2. Implement pure policy and report contracts.
3. Apply policy to static Vercel config and preview middleware.
4. Add a CLI verifier and parameterized domain/activation documentation.
5. GREEN verification: focused tests, Landing coverage/lint/types, static
   artifact inspection, Playwright regression, boundaries and docs.
6. Commit RED and GREEN checkpoints independently.

## Acceptance criteria

1. Every public response, including Campaign 308/410 outcomes, receives the
   reviewed headers before routing terminates.
2. Public framing is denied; preview framing is restricted to Studio and never
   becomes indexable/cacheable.
3. PostHog origins appear in CSP only when analytics is enabled; no wildcard
   network destination is introduced for the public site.
4. The verifier fails on wrong status, origin/canonical drift, missing noindex,
   sitemap drift or missing security headers without printing response bodies.
5. Default static output remains four pages, zero JavaScript and unchanged SEO
   content.
