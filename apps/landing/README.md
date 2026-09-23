# `@mini-workout/landing`

Astro owns the public marketing and editorial surface on the root domain. This
app is intentionally static-first and currently contains only a temporary shell;
approved home, campaign, pricing, article, and category pages belong to the next
content/template phase.

## Ownership boundary

- Astro pages, layouts, and section components stay in this app.
- Reuse `@mini-workout/design-system` CSS/tokens, but do not import React or
  `@mini-workout/ui` until the recorded UI integration gate is closed.
- Keep primary page content, title, description, and canonical identical across
  future experiment variants. MVP variants may affect only consent-gated CTAs or
  islands with reserved layout.
- Product login, admin, and Sanity Studio remain separate origins/apps.
- Do not add Sanity preview, publish webhooks, PostHog, or auth here before
  their plan gates pass.

## Local development

Use Node.js 22.12 or newer. Optionally copy `.env.example` to `.env` and set
`LANDING_SITE_URL` to the canonical origin for the target build. This value is
non-secret and is validated at Astro config load. The site defaults to `noindex`
and robots-disallow. Crawling is enabled only when `LANDING_INDEXING_ENABLED=true`
and Vercel sets `VERCEL_ENV=production`; leave it off until approved launch
content is deployed. Vercel build environments should set values directly
rather than store credentials in the repository.

```sh
pnpm --filter @mini-workout/landing dev
pnpm --filter @mini-workout/landing check-types
pnpm --filter @mini-workout/landing test
pnpm --filter @mini-workout/landing build
pnpm test:e2e:landing
```

Only explicitly indexable paths are included in `src/pages/sitemap.xml.ts`.
The initial sitemap contains the root only. Add page routes only when their
content is approved and their SEO metadata/canonical contract is complete.

## Intentional follow-up

The current home copy, shell navigation, social preview image, and app artwork
are not launch-ready. Marketing/content owners need to provide the approved
brand assets and content before Phase 4. Production domain routing is a Phase 6
rollout gate. Indexing is fail-closed until explicitly enabled on production.
Preview and publish behavior remain disabled until the Phase 3 architecture
gates pass.
