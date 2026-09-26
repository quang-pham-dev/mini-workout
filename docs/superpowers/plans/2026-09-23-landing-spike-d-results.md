# Landing Spike D — Static A/B SEO Safety

**Status:** MVP fallback approved; CDN/full-page experiment gate deferred  
**Date:** 2026-09-23  
**Prototype:** Static routes in `/private/tmp/landing-astro-spike`; no workspace app or dependencies changed.

## Question

Can material variants be pre-rendered while preserving crawlable control metadata,
avoiding client-side content flash, and keeping the experiment assignment out of
the page's SEO contract?

## Local experiment

Two static fixture pages were built with the same title, description, `h1`,
primary body and canonical (`https://example.com/campaigns/spike`). Only CTA
microcopy differs. Both pages are complete HTML, load no JavaScript, and share
the same robots directive. Astro's static build completed successfully with
104 routes (7.74 seconds on the first expanded run; 1.52 seconds on a warm
rerun). An automated artifact assertion confirmed matching title, description,
canonical and `h1`, plus no script element on either control fixture.

## Findings

- Pre-rendering control and variant documents is technically straightforward.
- Same canonical/title/description/primary content can be held constant while a
  CTA label varies, reducing duplicate-content and snippet drift risks.
- The experiment variant asset is still directly addressable in this local
  fixture. It is not linked from navigation, but that alone is not a production
  access/indexing policy.
- No CDN/Vercel rewrite or cache-key behavior was tested. There is no evidence
  yet that assignment is sticky, shared-cache-safe, bot-neutral, or can be
  immediately killed without serving a stale variant.
- No browser instrumentation ran, so consent-aware visible exposure and
  exactly-once delivery remain unproven. An A/A test is still required before
  interpreting conversion results.

## Gate decision

**MVP decision gate passed by fallback.** Use only consent-gated CTA/island
variants with equivalent reserved layout and unchanged SEO primary content and
metadata. The fallback does not claim that CDN assignment or full-page
experiments work; keep those deferred until a Vercel/CDN spike proves
deterministic assignment, cache isolation, bot/no-cookie control, kill-switch
propagation, no layout shift and exactly-once exposure after consent and
visibility. Do not route materially different indexable copy based on user agent
or crawler identity.

## Next checks

- Test a Vercel preview rewrite and inspect cache headers/key dimensions for
  cookie and no-cookie traffic.
- Decide the direct-request policy for internal variant artifacts and verify
  sitemap/link exclusion plus `X-Robots-Tag`/canonical behavior.
- Exercise sticky assignment, bot/no-cookie control, consent denial, visible
  exposure and kill switch in Playwright.
- Run an A/A allocation and exposure reconciliation before any A/B launch.
