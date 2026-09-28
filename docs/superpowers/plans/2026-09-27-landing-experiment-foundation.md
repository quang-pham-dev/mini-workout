# Landing Experiment Foundation

**Status:** Complete (foundation only; no experiment activated)
**Date:** 2026-09-27
**Owner:** `apps/landing`

## Goal

Add the Phase 5 experiment policy boundary without launching an experiment or
changing indexable content. The public page remains a complete static control;
assignment and exposure exist only after analytics consent.

## Scope

- a versioned, app-owned experiment registry independent of Sanity;
- strict validation for ownership, hypothesis, dates, stopping rules, route
  eligibility, basis-point allocation and A/A experience equivalence;
- deterministic assignment from an opaque, consent-created browser subject;
- a global build-time kill switch, off by default;
- preview-only forced variants with the same registry allowlist;
- one-time exposure capture after a registered target becomes visible;
- experiment/variant attribution on eligible CTA clicks;
- an A/A readiness contract, without activating an A/A or A/B test.

Excluded:

- experiment content, active allocations or a public experiment UI;
- full-page, server-request, cookie, CDN or CMS-controlled assignment;
- consent UI/legal copy and production analytics activation;
- PostHog dashboard configuration or statistical result sign-off.

## Design

`apps/landing` owns assignment because the variants and SEO restrictions are
specific to this public surface. `packages/analytics` continues to own only the
provider-neutral event vocabulary. Sanity may later reference approved content
variants but never owns traffic allocation.

The registry is compiled with the app and defaults to an empty list. Every
allocation totals 10,000 basis points. A/A variants must resolve to the same
experience key; this makes measurement validation possible without a visual or
SEO difference. The deterministic hash includes experiment ID and version, so
version changes deliberately re-bucket participants.

The runtime starts only when all gates pass: analytics is enabled, experiments
are enabled, consent is granted, the route is allowlisted and an active
experiment exists. Only then may it create an opaque local subject ID. Exposure
is emitted once per experiment version and variant after visibility. Storage,
observer and analytics-provider failures degrade to the static control and may
not block navigation.

Preview override parameters are accepted only in a preview build and only for
an experiment and variant already in the registry. They are not a production
backdoor and never affect canonical metadata, structured data or crawl rules.

## Delivery sequence

1. Write RED tests for registry rejection, deterministic weighted allocation,
   consent denial, kill switch, preview restriction and exposure deduplication.
2. Implement registry contracts, validation and assignment as pure TypeScript.
3. Implement the browser coordinator behind injected storage/visibility
   boundaries and connect it to the existing consent-aware analytics entry.
4. Carry bounded assignment metadata into CTA events without accepting
   arbitrary properties.
5. Add environment parsing, documentation and empty production registry.
6. Run focused tests, format/lint/types, Landing coverage/build/budget/E2E,
   boundaries and docs checks; review the complete dirty diff without touching
   unrelated generated Admin changes.

## Acceptance criteria

1. Disabled or denied-consent execution does not load experiment state, create
   an ID, mutate a target or emit exposure.
2. The same opaque subject and registry version always receive the same variant;
   allocations respect validated basis-point ranges.
3. Invalid/expired definitions fail closed and A/A definitions cannot point to
   different experiences.
4. Visibility emits at most one sanitized exposure per experiment version and
   variant, including across repeated initialization.
5. Forced variants work only in preview and remain allowlisted.
6. With the empty registry and default-off kill switch, current HTML, route
   inventory, canonical metadata and zero-JavaScript baseline remain unchanged.

## Activation gates

Before the first A/A test, Marketing/Product/Data/Legal still need to approve
the experiment brief, primary metric, guardrails, sample size/stopping rule,
dates, cleanup owner, consent surface and PostHog report. A/A must pass allocation,
deduplication and event-join checks before any A/B result is trusted.

## Result

The compiled registry, validator, deterministic assignment, browser target
adapter, default-off kill switch, preview-only override, consent-created
subject, visible one-time exposure and CTA attribution are implemented. The
registry is empty and the public artifact remains unchanged.

Verification evidence:

- Landing format, lint and Astro type checks pass.
- 159 unit/contract tests pass across 24 files at 87.73% statements and 82.54%
  branches; the experiment boundary is 98.93% statement covered.
- Public static build remains four pages with no Pricing route and 0 B gzip
  JavaScript; CSS is 8,331 B gzip and total output is 409,515 B.
- Indexing isolation and artifact budget gates pass.
- All 14 Landing Playwright checks pass across desktop and mobile.
- Turbo boundaries pass across 1,062 files; documentation and diff checks pass.

The live A/A test remains deliberately unstarted. It requires the activation
gates above and is the next Phase 5 product/data step, not an offline code gate.
