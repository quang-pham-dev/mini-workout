# Landing Spike F — SEO and JavaScript Baseline

**Status:** Partial local evidence; image, Lighthouse and accessibility gates remain open  
**Date:** 2026-09-23  
**Prototype:** `/private/tmp/landing-astro-spike`; static Astro fixture only.

## Question

Can representative Astro output keep primary content crawlable without
JavaScript and fit one interactive island under the proposed 120 KB compressed
first-party JavaScript ceiling?

## Evidence

- The current production Home + Mobility + Article artifact now has an enforced
  CI baseline: **0 bytes gzip first-party JavaScript**, **6,895 bytes gzip CSS**,
  **132,910 bytes** for the largest file and **399,446 bytes** total output.
  The package gate fails above 120 KB gzip JavaScript, 48 KB gzip CSS, 512 KB
  per file or 1.5 MB total output. Commands: `pnpm --filter
@mini-workout/landing build` then `pnpm --filter @mini-workout/landing
check-budget`.

- Static build generated the SEO fixture as HTML with title, description,
  canonical, `index, follow`, breadcrumb navigation, one `h1`, article body and
  section heading in the initial response.
- A no-island control campaign fixture contains no client scripts and keeps its
  primary content in static HTML.
- The article fixture adds one hydrated React Button island. Its emitted
  shared-first-party JavaScript assets total **79,401 bytes gzip** in this
  prototype: Astro client ~65.8 KB, React renderer ~3.2 KB and component chunks
  ~10.3 KB plus a 56-byte entry. This excludes inline bootstrap bytes, CSS,
  analytics, consent UI, fonts and image transfer. Treat it as a lower-bound
  module estimate, not a final page-weight measurement.
- Primary article copy and headings remain present in HTML around the island.
- Automated static artifact assertions passed for shared variant SEO metadata,
  script-free no-island HTML, server-rendered article copy and absence of the
  draft fixture title from the static campaign artifact.

## Findings and gate

**Partial pass.** Astro's static HTML and island boundary support the desired SEO
baseline. One island leaves limited room under a 120 KB budget once analytics,
consent and any additional interaction are added. Keep content pages island-free
by default and budget complete compressed transfer per route.

Not measured: Sanity image transformations/srcsets, local font subsets, JSON-LD
validation, Lighthouse mobile/desktop, Core Web Vitals lab proxies, keyboard
and screen-reader behavior, third-party analytics/consent payload, hydration
mismatch, or a realistic article/campaign stress fixture. No production SEO or
CWV claim should be made from this spike alone.

## Next checks

- Use representative Sanity image dimensions, crop/focal point and alt-text
  fixtures; verify responsive candidates and reserved aspect ratio.
- Add schema-owned JSON-LD and validate its escaping and type-specific shape.
- Run Lighthouse CI at agreed mobile/desktop settings with analytics denied and
  consented; record complete compressed JavaScript/CSS/image transfer.
- Crawl with JavaScript disabled and test metadata, headings, breadcrumbs,
  keyboard, focus and reduced-motion behavior.
- Confirm real-user p75 Core Web Vitals after a staged deployment before
  treating lab scores as launch acceptance.
