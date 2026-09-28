# Landing Pricing Foundation

**Status:** Complete (offline/fixture-free)
**Date:** 2026-09-27
**Owners:** `apps/landing`, `apps/studio`

## Scope

Build the offline Pricing content boundary and reusable Astro presentation
without publishing `/pricing/` or inventing commercial terms.

Included:

- schema-v1 Landing mapper and view model;
- exact minor-unit amounts, ISO-style currency codes and explicit billing
  cadence;
- stable plan IDs, ordered entitlements, approved conversion action and at most
  one explicitly recommended plan;
- mandatory cancellation and refund copy;
- Sanity singleton schema, validation, published/draft query and repository
  mapping;
- an Astro-only Pricing template with semantic comparison, FAQ and terms;
- contract, schema, query, repository and regression tests.

Excluded until Product/Commercial/Legal approval:

- a public `/pricing/` route or sitemap/navigation entry;
- fixture prices, savings claims, discounts, “most popular” labels or dynamic
  billing controls;
- checkout/payment behavior.

## Design decision

Pricing uses one singleton document because currency, terms and the comparison
set must publish atomically. Money is stored as non-negative integer minor units
and formatted only by the view layer with an explicit locale contract. Recurring
plans require a positive interval and `month` or `year`; one-time plans cannot
carry an interval. Editors may recommend at most one plan, but the UI does not
invent recommendation or urgency language.

The visual template continues the current editorial-fitness system: one
asymmetric comparison field, restrained dividers and typographic hierarchy
rather than a generic three-card SaaS grid. It renders no client JavaScript.

## Acceptance criteria

1. Invalid money, cadence, duplicate IDs, unsafe CTA actions, missing terms and
   multiple recommendations fail closed.
2. Draft or absent Pricing content maps to no public page.
3. Sanity published and preview projections share the same mapper contract.
4. The repository loads Pricing atomically with the rest of the snapshot.
5. The reusable template has one `h1`, semantic plan headings, native FAQ
   disclosures and approved terms, with no public route.
6. Landing and Studio verification suites remain green and the current static
   route inventory is unchanged.

## Verification plan

- RED/GREEN mapper and Studio validation tests;
- Landing and Studio format, lint, type and unit/coverage suites;
- fixture static build, artifact budget and Landing browser regression;
- Turbo boundaries, documentation checks and maintainer diff review.

## Result

Landing now owns the versioned Pricing mapper, fixture-free catalog, Sanity
published/draft projections, repository integration and an Astro-only
presentation component. Studio exposes Pricing as the guarded
`mini-workout-pricing` singleton and validates the same money, cadence,
identifier, entitlement, CTA, recommendation and terms invariants before
publication.

No `/pricing/` route, sitemap entry or navigation item exists. Activating that
surface still requires approved commercial content and a dedicated route/E2E
review.

Verification evidence:

- Landing: 147 tests across 21 files; 87.67% statement and 81.85% branch
  coverage.
- Studio: 49 tests across 6 files; 96.34% statement and 84.94% branch coverage.
- Landing and Studio formatting, lint and type checks pass; Studio production
  build succeeds.
- Static Landing remains four pages and explicitly contains no
  `dist/pricing/index.html`.
- Artifact budget passes at 0 B compressed JavaScript, 8,313 B compressed CSS,
  132,910 B largest file and 411,162 B total output.
- All 14 existing Landing Playwright checks pass on desktop and mobile.
- Turbo boundaries pass across 1,056 files and documentation/diff checks pass.

Visual browser review of the Pricing template remains an activation task
because rendering it now would require fabricated commercial content or a
temporary public route, both intentionally excluded from this slice.
