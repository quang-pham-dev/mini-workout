# Landing Spike C — Static Build Scale

**Status:** Partial evidence; CMS and deployment measurements remain open  
**Date:** 2026-09-23  
**Timebox:** Initial local benchmark (not the full two-day allocation)  
**Prototype:** Synthetic route generation in `/private/tmp/landing-astro-spike`.

## Question

Can rebuild-on-publish meet the 2-5 minute content freshness target at projected
page volume while leaving the last successful deployment available if a build
fails?

## Method

- Astro 7.3.4 static production build.
- Generated 100, 1,000 and 10,000 deterministic campaign routes from local
  fixtures, with no CMS request, rich Portable Text, real images or deployment.
- Timed local production builds on Node 25.4.0; root CI pins Node 22.20.0.

## Results

| Routes | Local build wall time |        Output size |
| -----: | --------------------: | -----------------: |
|    100 |                3.68 s |       Not captured |
|  1,000 |                4.91 s |       Not captured |
| 10,000 |                9.51 s | 39 MB uncompressed |

All builds exited successfully; the 10,000-route output contained 10,000
campaign HTML files. These timings measure Astro rendering of trivial local
fixtures. They do not include Sanity API latency, content images, Vercel build
queue, CDN propagation or deployment hooks.

## Findings

- Pure Astro prerendering scales comfortably for the synthetic 10,000-route
  fixture on this machine.
- Output size grows with route count and needs a production-sized content/image
  sample before estimating deploy time or storage.
- The result supports keeping static generation as the MVP default. It does not
  yet prove the publication SLA because the CMS, CI and Vercel stages were not
  measured.
- Node version differs from CI and Vercel runtime; rerun the benchmark under the
  pinned Node 22.20.0 and supported Vercel build image before treating times as
  capacity figures.
- A follow-up run with pinned Node 22.20.0 could not start Astro because this
  disposable prototype's install contains the x64 Rolldown native binding,
  while the pinned binary is arm64; the optional arm64 binding is absent. No
  dependency install or lockfile mutation was attempted. The pinned-runtime
  benchmark therefore remains open rather than being inferred from the Node 25
  result.

## Gate decision

**Partial pass.** Astro's local route rendering is not the scaling bottleneck at
10,000 minimal pages. Before a full pass, benchmark representative article and
campaign documents with real content projections and optimized images, trigger
a Vercel build through the publish path, record queue/build/propagation time, and
prove a failed build leaves the previous production deployment active.
