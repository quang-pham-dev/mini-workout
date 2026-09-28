# `@mini-workout/landing`

Astro owns the public marketing and editorial surface on the root domain. This
app is intentionally static-first. The Home, Mobility category and first
Mobility Article vertical slices exercise the approved architecture. Campaign
now has an offline content/lifecycle contract and reusable route/template, but
no public fixture or generated URL. Pricing has a fixture-free contract,
Sanity/repository boundary and reusable Astro template; its public route remains
gated by approved commercial inputs.

## Ownership boundary

- Astro pages, layouts, and section components stay in this app.
- Reuse `@mini-workout/design-system` CSS/tokens, but do not import React or
  `@mini-workout/ui` until the recorded UI integration gate is closed.
- Keep primary page content, title, description, and canonical identical across
  future experiment variants. MVP variants may affect only consent-gated CTAs or
  islands with reserved layout.
- Product login, admin, and Sanity Studio remain separate origins/apps.
- Keep Sanity preview isolated to the `LANDING_OUTPUT=preview` SSR artifact.
  The signed publishing route is injected only into that protected artifact;
  Product auth remains behind its own boundary. PostHog is loaded only by the
  consent-gated adapter described below.
- Treat CMS-shaped content as untrusted. Published Article fixtures enter via
  app-owned Article/Category mappers under `src/content/`; shared slug, SEO,
  local-media and internal-link primitives enforce one policy. Unknown schema
  or section versions fail closed, while drafts never enter static generation.
- Campaign schedule and expiry behavior are mandatory CMS fields. Scheduled
  campaigns are omitted; active and archived campaigns can prerender, with
  conversion suppressed for archives. Until a real offer and expiry policy are
  approved, the collection remains empty and no campaign URL is generated.
  Redirect and `gone` policies become validated Vercel Build Output API routes
  with exact `308` and `410` status codes. Campaign routes are evaluated before
  trailing-slash normalization and filesystem routing.
- Pricing is a CMS singleton with exact minor-unit amounts, explicit currency
  exponent/locale, billing cadence, entitlements, conversion action,
  cancellation/refund copy and at most one approved recommendation. The local
  fixture is `null`, so no `/pricing/` route or invented price is published.

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
pnpm --filter @mini-workout/landing check-rollout
pnpm test:e2e:landing
```

Static builds also create `.vercel/output` alongside `dist`. The Build Output
API v3 artifact copies the reviewed static files and adds Campaign expiry
routing derived from the same build manifest as `getStaticPaths`. Keep the
Vercel Landing project rooted at `apps/landing`; do not configure `dist` as a
manual Output Directory because `.vercel/output` is the deployment contract.
Preview builds continue to use the Astro Vercel adapter and do not run this
static-output transformation. In Vercel, configure the public static Landing
project with Framework Preset `Other`, the normal workspace build command, and
no Output Directory override so the Build Output API artifact is authoritative.
Keep the separate editor-preview project on the Astro preset with
`LANDING_OUTPUT=preview`.

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

## Analytics baseline

Landing analytics is off by default, so normal local and static builds retain
the zero-JavaScript baseline. To prepare an environment, set
`LANDING_ANALYTICS_ENABLED=true`, `LANDING_POSTHOG_KEY` to the public PostHog
project key and optionally `LANDING_POSTHOG_HOST`. The key is public browser
configuration, not a server token. Do not put a personal or server API key here.

Even when configured, the provider is not imported and no event is captured
until `mini-workout:analytics-consent=granted` exists in local storage. No
consent UI is implied by this adapter; keep analytics disabled until approved
privacy copy and the consent surface are available. Events use bounded route
templates, stable CTA IDs, aggregate referrer classes and sanitized UTM values.
Raw referrer URLs, destination URLs, query strings, auth identity and arbitrary
properties are not accepted.

Experiments have a second, independent kill switch:
`LANDING_EXPERIMENTS_ENABLED`. It may be enabled only when analytics is enabled,
the consent surface and experiment brief are approved, and the compiled Landing
registry contains a reviewed test. The registry is intentionally empty today.
Assignment is deterministic from an opaque ID created only after consent;
exposure is captured once after the registered CTA/island is visible. Sanity
does not own traffic allocation. Preview builds may force an allowlisted variant
with `?mw_experiment=<id>&mw_variant=<id>`; production ignores this override.

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
publish automation remains disabled until its Vercel/Sanity secrets, protection
bypass and activation checklist in the [Landing publishing
runbook](../../docs/observability/LANDING_PUBLISHING_RUNBOOK.md) are completed.

Domain rollout, security-header verification and rollback steps are maintained
in the [Landing rollout runbook](../../docs/observability/LANDING_ROLLOUT_RUNBOOK.md).
After building the exact candidate locally, compare it with an HTTPS deployment:

```sh
LANDING_ROLLOUT_URL=https://candidate.example \
LANDING_ROLLOUT_INDEXABLE=false pnpm --filter @mini-workout/landing check-rollout
```

The checker emits only issue codes and paths. Keep non-production candidates
non-indexable; run once with `false` before cutover and with `true` only after
the production indexing gate is intentionally enabled.
