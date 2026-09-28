# Landing Campaign Delivery Spike

**Status:** Complete (offline/static boundary)
**Date:** 2026-09-27
**Owner:** `apps/landing`

## Verified platform constraints

- Astro static output cannot use runtime `Astro.redirect`; redirects require
  host configuration or server rendering.
- Vercel's high-level redirects support only redirect status codes, not `410`.
- Vercel legacy/build-output routes can return a custom status, but this is a
  provider-specific artifact and has not yet been verified in this repository's
  static deployment flow.

Therefore this slice must never turn an expired `gone` campaign into a 404 or
use a meta-refresh redirect. Vercel Build Output API v3 is the selected
provider boundary because its ordered low-level routes support both `308` with
a `Location` header and an explicit `410` response.

## Acceptance criteria

1. A deterministic delivery planner separates scheduled, active, archived,
   redirect and gone campaigns using an injected clock.
2. Active and archived campaigns can prerender from the same Astro template.
3. Archived pages suppress conversion CTAs and identify their archived state.
4. Scheduled campaigns do not enter static paths or sitemap inventory.
5. Redirect/gone campaigns produce validated, ordered Build Output API routes
   before filesystem routing.
6. No fixture campaign is added, so the current production route inventory is
   unchanged.

## Verification

Implemented with focused RED/GREEN policy tests and then verified with the full
Landing suite:

- 136 unit/contract tests pass across 19 files.
- Coverage remains above the repository threshold: 87.69% statements and
  81.55% branches overall.
- Astro static build succeeds with the current four-page public inventory; no
  campaign fixture or URL is emitted.
- Artifact budget passes at 0 B compressed JavaScript, 8,108 B compressed CSS,
  132,910 B largest file and 410,465 B total output.
- All 14 Landing Playwright checks pass across desktop and mobile.
- Dual-output verification confirms preview builds retain Astro's Vercel
  `_render` routes while static builds end in a validated Build Output API v3
  filesystem route.
- The canonical E2E command now pins static fixtures and public/member origins,
  so local deployment `.env` values cannot silently change its contract.

The static build now emits `.vercel/output` from the same Campaign delivery
plan used by Astro prerendering. The versioned manifest accepts only canonical
Campaign paths, internal redirect destinations, exact `308`/`410` statuses and
unique sources. The generated route contract places Campaign outcomes before
trailing-slash normalization and filesystem lookup. Malformed or missing
manifests fail the build.

The remaining provider gate is deployment evidence: deploy a controlled
expired redirect and gone fixture to a protected Vercel preview, assert the
live status and `Location` header, then remove the fixture. No production
campaign should select either policy before that evidence is captured. The
public static Vercel project must use Framework Preset `Other`, its workspace
build command and no Output Directory override; the separate editor-preview
project remains on the Astro preset.
