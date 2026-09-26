# `@mini-workout/landing`

Astro owns the public marketing and editorial surface on the root domain. This
app is intentionally static-first. The Home, Mobility category and first
Mobility Article vertical slices exercise the approved architecture; campaign
and pricing templates remain gated by their content contracts and the delivery
plan.

## Ownership boundary

- Astro pages, layouts, and section components stay in this app.
- Reuse `@mini-workout/design-system` CSS/tokens, but do not import React or
  `@mini-workout/ui` until the recorded UI integration gate is closed.
- Keep primary page content, title, description, and canonical identical across
  future experiment variants. MVP variants may affect only consent-gated CTAs or
  islands with reserved layout.
- Product login, admin, and Sanity Studio remain separate origins/apps.
- Keep Sanity preview isolated to the `LANDING_OUTPUT=preview` SSR artifact.
  Publish webhooks, PostHog and product auth remain behind their plan gates.
- Treat CMS-shaped content as untrusted. Published Article fixtures enter via
  app-owned Article/Category mappers under `src/content/`; shared slug, SEO,
  local-media and internal-link primitives enforce one policy. Unknown schema
  or section versions fail closed, while drafts never enter static generation.

## Local development

Use Node.js 22.12 or newer. Optionally copy `.env.example` to `.env` and set
`LANDING_SITE_URL` to the canonical origin for the target build. This value is
non-secret and is validated at Astro config load. The site defaults to `noindex`
and robots-disallow. Crawling is enabled only when `LANDING_INDEXING_ENABLED=true`
and Vercel sets `VERCEL_ENV=production`; leave it off until approved launch
content is deployed. Vercel build environments should set values directly
rather than store credentials in the repository.

Set `MEMBER_APP_URL` to the member app origin for each
environment. Landing derives the stable `/login` and `/register` routes from
this origin. Use `http://localhost:3000` locally, the web app's staging origin
for staging, and its production domain for production.

Public production uses `LANDING_OUTPUT=static`. The editor preview is a
separate Vercel SSR deployment built with `LANDING_OUTPUT=preview`, protected
by Deployment Protection and configured with a server-only
`SANITY_API_READ_TOKEN`. Preview responses are always private, `no-store` and
`noindex`; the static artifact does not contain draft-mode endpoints.

```sh
pnpm --filter @mini-workout/landing dev
pnpm --filter @mini-workout/landing check-types
pnpm --filter @mini-workout/landing check-boundaries
pnpm --filter @mini-workout/landing test
pnpm --filter @mini-workout/landing build
pnpm --filter @mini-workout/landing check-budget
pnpm test:e2e:landing
```

Only explicitly published paths are included in `src/pages/sitemap.xml.ts`.
The sitemap currently contains Home, Mobility and the published Mobility field
note. Add routes only when their unique content and SEO metadata/canonical
contract are complete.

Published content is loaded through one repository. `LANDING_CONTENT_SOURCE`
defaults to `fixtures`; set it to `sanity` only with `SANITY_PROJECT_ID` and
`SANITY_DATASET`. An activated Sanity build fails closed on configuration,
provider or contract errors and never silently publishes stale fixture content.

Before switching a real environment to Sanity, compare its published snapshot
with the reviewed local fixture baseline. The checker reports only stable issue
codes and content paths; it does not print copy, asset URLs or provider errors.

```sh
SANITY_PROJECT_ID=<project-id> SANITY_DATASET=<dataset> \
  pnpm check:landing-content-parity
```

Parity covers Article/Category route inventory, canonical and SEO values,
Article-to-Category relationships, ordered section identities and reserved media
dimensions. A mismatch or unavailable/invalid CMS exits non-zero. This is an
activation gate, not a permanent requirement that future editorial content
remain identical to the initial fixture baseline.

`check-boundaries` applies the Astro-native ownership rule to `.astro` imports,
including files ESLint does not parse. `check-budget` inspects the production
artifact and enforces 120 KB gzip JavaScript, 48 KB gzip CSS, 512 KB per file
and 1.5 MB total static-output ceilings. CI runs the budget after the Landing
build.

## Intentional follow-up

The current Home/Mobility/Article copy, social preview image and photography are
not launch-ready. Marketing/content owners need to provide approved brand assets
and content. Production domain routing is a Phase 6 rollout gate. Indexing is
fail-closed until explicitly enabled on production. Preview deployment
protection and the real Presentation handshake remain Phase 3 external gates;
publish automation is still disabled.
