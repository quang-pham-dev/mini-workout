# Strapi 5 + Astro Landing Migration Plan

**Status:** Approved; M1 foundation and M2 adapter implemented; M3 preview code
implemented pending deployed handshake; M4 Level 1 delivery implemented; M5–M7
remain open
**Date:** 2026-09-29
**Owner:** Growth Platform / Content Platform
**Decision class:** CMS replacement, independent runtime boundary, editorial publishing, SEO
**Supersedes:** The Sanity-specific parts of
[`2026-09-22-landing-platform-architecture.md`](2026-09-22-landing-platform-architecture.md)
after the decision gates in this plan pass

## 1. Executive decision

Replace Sanity and `apps/studio` with a self-hosted Strapi 5 service while
keeping the public Landing application on Astro and preserving the existing
validated Landing view models.

```text
editor
  -> Strapi admin (draft/save/preview/publish)
  -> Strapi PostgreSQL + external object storage

Astro preview SSR
  -> authenticated draft snapshot from Strapi

Strapi publish/unpublish
  -> signed, replay-protected publish event
  -> coalesced Vercel Deploy Hook
  -> Astro static build fetches published snapshot
  -> validation/build gates
  -> atomic Landing deployment
```

The migration does **not** require a Landing rewrite. The current repository
boundary already isolates Astro pages from Sanity documents. Add a Strapi
adapter beside the fixture and Sanity adapters, prove output parity, switch the
environment-selected source, then remove Sanity after an observation window.

The production Landing remains static-first. Strapi is a build-time content
dependency, not a request-time dependency for public traffic. A Strapi outage
therefore blocks a new content deployment but does not take the currently
deployed Landing site offline.

## 2. Repository findings

### Reusable boundaries

- `apps/landing/src/content/published-content-repository.ts` owns a stable
  `PublishedContentSnapshot` for articles, campaigns, categories, pricing,
  marketing pages and the site shell.
- Astro routes consume validated view models rather than GROQ results.
- Sanity queries and mapping are already isolated under
  `apps/landing/src/content/sanity/`.
- Static and preview output modes are already separate. Public content can stay
  static while editorial preview remains an authenticated Astro SSR runtime.
- Reusable validators already cover SEO, media, slugs and internal links. They
  remain the final zero-trust boundary even if Strapi validates editor input.
- The publish webhook, service observations, publish-ready signal and rollout
  runbooks provide useful provider-neutral primitives. Sanity-specific request
  authentication and payload parsing must be replaced, not copied.

### Code that is provider-specific

- `apps/studio/` schemas, desk structure, Presentation configuration and seed
  tools are wholly Sanity-specific.
- `apps/landing/src/content/sanity/`, Sanity environment variables and preview
  enablement use GROQ, Sanity perspectives, stega and Sanity preview secrets.
- CSP/frame rules, documentation and deployment checks name Sanity origins.

### Constraint created by Strapi

Strapi is now a genuine independent backend runtime. The repository guideline
that previously rejected a generic contracts package no longer applies to a
narrow CMS transport contract. If a custom snapshot endpoint is selected,
`@mini-workout/contracts` is justified for versioned, public Zod DTOs shared by
Strapi and Landing. Domain view models remain with their current owners; this
package must not become a miscellaneous type bucket.

## 3. Target topology

Recommended production topology:

```text
mini-workout.com                  -> apps/landing, static public deployment
preview.mini-workout.com          -> apps/landing, protected SSR preview
members.mini-workout.com          -> apps/web
admin.mini-workout.com            -> apps/admin
studio.mini-workout.com/admin     -> apps/cms Strapi admin
studio.mini-workout.com/api       -> apps/cms Strapi Content API
```

The same Strapi origin for Admin and API is the operationally simplest MVP.
The reverse proxy may restrict `/admin` by identity-aware access or IP policy,
but Landing's server-side builds still need `/api`. PostgreSQL must not be
publicly reachable.

Rename the implementation workspace from `apps/studio` to `apps/cms`. Keep the
human-facing `studio.*` domain if desired; source names should describe the
runtime rather than preserve the old Sanity product name.

## 4. Content ownership and model

### Strapi owns

- Content authoring and editorial validation.
- Draft/published state through native Draft & Publish.
- Slugs, campaign schedule/expiry policy, relationships, media and ordered
  sections.
- Site settings, primary navigation and pricing singletons.
- Full-screen Preview links from Content Manager.
- The action that starts public publication.

### Landing owns

- Route construction, canonical policy, HTML semantics, structured data and
  rendering.
- Final validation of every external payload.
- Experiment assignment and reporting. Strapi may reference an approved
  experiment key but must not define allocation or analytics semantics.
- Static deployment acceptance gates and fail-closed behavior.

### Content types

Use collection types for `article`, `author`, `category`, `campaign` and
`marketing-page`. Use single types for `pricing-page`, `site-settings` and
`primary-navigation`. Enable Draft & Publish for all content that affects the
public site.

Use versioned Strapi components for the constrained section union, for example:

```text
article.prose-v1
article.pull-quote-v1
campaign.hero-v1
campaign.feature-grid-v1
campaign.faq-v1
shared.media-v1
shared.seo-v1
shared.internal-link-v1
```

The component UID and `schemaVersion` form a migration boundary. Do not reuse a
component UID for an incompatible shape. Unknown component versions fail the
preview/build contract instead of silently rendering an approximation.

### Important modeling decisions

- Use native Draft & Publish; do not duplicate it with an editor-managed
  `status` field. The Strapi adapter assigns the stable Landing status after
  requesting the published perspective.
- Keep `documentId` as a CMS identity only. URLs use validated slugs/campaign
  IDs, never Strapi integer IDs or document IDs.
- Standard canonical paths should be derived by Landing from content type and
  slug. Do not make canonical URLs freely editable in MVP; an explicit override
  can be added later with validation and approval workflow.
- Money remains an integer in minor units. Do not use floats for pricing.
- Internal links stay root-relative and allowlisted. Reject schemes,
  protocol-relative URLs and traversal at both Strapi and Landing boundaries.
- Store media alt text and intrinsic dimensions. Use external object storage
  with stable URLs; local container uploads are not a production default.
- Do not enable i18n until a real locale requirement exists. If enabled later,
  each locale is independently published and must produce a locale-aware
  canonical/hreflang inventory.

## 5. Content delivery contract

### Recommended: custom versioned snapshot endpoint

Prefer a custom Strapi endpoint over coupling Landing to six large REST
`populate` query strings:

```text
GET /api/landing/v1/snapshot?status=published
GET /api/landing/v1/snapshot?status=draft        # preview token only
```

Response envelope:

```ts
type LandingSnapshotV1 = {
  schemaVersion: 1;
  generatedAt: string;
  revision: string;
  articles: CmsArticleV1[];
  campaigns: CmsCampaignV1[];
  categories: CmsCategoryV1[];
  pricing: CmsPricingV1;
  marketingPages: CmsMarketingPageV1[];
  siteShell: CmsSiteShellV1;
};
```

Why this is preferred:

- Strapi owns Document Service queries, explicit field selection, population,
  pagination and provider shape.
- Landing gets one stable, versioned transport instead of Strapi REST details.
- Dynamic-zone population and Strapi upgrades are contained in `apps/cms`.
- The endpoint can enforce bounded result sizes and deterministic ordering.
- Both runtimes validate the DTO; Landing then maps it into the existing domain
  view models and applies SEO/media/link validation again.

Use a custom read-only Content API token, sent only from server/build code in
the `Authorization: Bearer ...` header. Do not grant anonymous Public-role read
permissions merely because the deployed site is public. Use a separate preview
token or policy that can request drafts; never expose either token in browser
JavaScript or URLs.

### Rejected as the target: raw REST per content type

This remains a valid spike/fallback, but relations, media, components and
dynamic zones are not populated by default. Deep `populate` URLs become part
of the Landing adapter, pagination is easy to miss, and provider changes leak
across the boundary. `populate=deep` plugins are not an accepted shortcut.

## 6. Astro integration

### Public build

1. `LANDING_CONTENT_SOURCE=strapi` selects `StrapiContentSource`.
2. The repository fetches the published snapshot once and caches the promise
   for the build, matching current behavior.
3. Zod parses the transport envelope; provider mappers produce the existing
   `PublishedContentSnapshot`.
4. `getStaticPaths()` generates category, article and campaign routes.
5. Existing SEO inventory, internal-link, canonical and browser gates run.
6. Any invalid required content fails the build; Vercel keeps the previous
   successful static deployment live.

Do not add runtime fetching to public pages. Astro's normal static generation
is the correct equivalent of a Next.js build-time content fetch for this site.

### Preview

Strapi Free includes full-screen Preview; its enhanced side-by-side Live
Preview is paid. The MVP therefore uses the free Preview handler and the
existing protected Astro SSR preview deployment:

1. Strapi `config/admin.ts` maps content UID + slug to a known Landing route.
2. It returns a URL to the Landing preview-enable endpoint containing a short
   lived, signed payload or one-time token, requested route and draft/published
   perspective.
3. The endpoint verifies signature, expiry, route allowlist and redirect
   origin, then sets an `HttpOnly`, `Secure`, bounded preview session cookie.
4. Preview SSR fetches `status=draft` using a server-only token and emits
   `noindex, nofollow`, `no-store` responses.
5. The preview deployment remains protected independently of the cookie. A
   perspective cookie is mode state, not authorization.

Astro does not provide Next.js Draft Mode. This explicit preview session is the
correct adaptation and largely reuses the architecture already proven for
Sanity. Remove Sanity visual editing/stega. Do not attempt paid Strapi Live
Preview behavior in this migration.

## 7. Publish mechanism

### Editorial semantics

"Publish" means the entry becomes part of Strapi's published snapshot and a
Landing build is requested. It does **not** mean the public deployment is
instantaneously live. The Strapi UI should state that publication is queued;
the old Landing deployment remains live until the new build passes.

Subscribe only to events that can change the public snapshot:

- `entry.publish`
- `entry.unpublish`
- deletion of a currently public entry, if the selected Strapi behavior does
  not emit the required unpublish signal first
- `media.update`/`media.delete` only if published content can change without an
  owning entry being republished

Do not subscribe to generic `entry.update`: publishing also emits an update,
which otherwise causes duplicate deploys, and drafts must not deploy publicly.

### Two implementation levels

**Level 1 — migration MVP:** Strapi built-in webhook sends a bearer secret to a
protected Landing automation endpoint. The receiver validates the event/UID,
body size and timestamp, coalesces bursts, and invokes the Vercel Deploy Hook.

**Level 2 — production hardening (recommended before marketing scale):** a
small Strapi publication service signs raw payload + timestamp with HMAC,
creates an idempotency key and writes an outbox record in PostgreSQL. A worker
retries with backoff and coalesces all events within a short window into one
deploy request. The Landing endpoint verifies HMAC in constant time and rejects
expired/replayed requests.

Built-in webhooks support authentication headers, but a static bearer token
alone does not provide payload integrity, replay prevention, durable retries or
coalescing. Directly storing a Vercel Deploy Hook URL in an editor-managed
webhook is acceptable only for an initial spike, not the target architecture.

Because the current Vercel account is Free, deployment-completion webhooks are
not assumed. Phase 1 reports "deploy accepted/queued" in Strapi; Vercel remains
the source of build/deployment status. A future polling adapter or provider
upgrade may feed the existing publish-ready signal without blocking migration.

## 8. Self-hosted production baseline

- Strapi 5 TypeScript app in `apps/cms`, pinned to an exact tested version.
- Production Docker image built in multiple stages; run `start`, never
  `develop`.
- PostgreSQL with persistent storage, automated backups, restore rehearsal and
  no public database port.
- External S3-compatible or Cloudinary media provider. If local uploads are
  deliberately chosen, mount durable storage and include it in independent
  backup/restore procedures.
- TLS reverse proxy, health/readiness checks, resource limits and graceful
  restart policy.
- Secrets injected by the deployment platform: app keys, API token salt,
  admin JWT secret, transfer token salt, encryption key, database credentials,
  preview signing secret and webhook signing secret.
- Admin access protected by strong accounts/MFA where supported and optionally
  an identity-aware proxy. Do not expose bootstrap/admin tokens to Landing.
- CORS/CSP/proxy configuration restricted to the real Admin, preview and media
  origins. Public Astro builds do server-to-server requests, so browser CORS is
  not a reason to expose broad origins.
- Structured logs and metrics for snapshot latency/errors, preview outcomes,
  publish event delivery, outbox depth/retries and build-trigger acceptance.
- Dependency/configuration/internal failures follow
  `docs/ERROR_HANDLING_CONVENTION.md`: stable codes, report once, sanitized
  telemetry and generic public responses.

## 9. Required spikes and decision gates

### S1 — Strapi version/runtime compatibility (0.5 day)

Scaffold a disposable Strapi 5 TypeScript workspace with the repository's
Node/pnpm/Turbo constraints. Prove local dev, production build/start, generated
types and Docker build. Decide whether `apps/cms` remains inside Turbo for build
and tests while deployment uses a dedicated container.

**Pass:** reproducible build/start without weakening workspace constraints.

### S2 — Snapshot contract and Dynamic Zone population (1 day)

Implement one Article and one Campaign vertical slice in a disposable branch:
Document Service query, explicit population, transport Zod schema, Strapi
adapter and equality against current reviewed fixtures.

Measure payload size and query time with representative counts. Verify missing
relations/media and unknown components fail with stable error codes.

**Pass:** exact content parity and bounded query/payload behavior.
**Fallback:** separate versioned endpoints per domain; do not leak raw generic
REST into Astro pages.

### S3 — Astro draft Preview on Strapi Free (1 day)

Configure the Strapi Preview handler for Home, Category, Article, Campaign and
Pricing. Exercise a signed preview session against the built Astro SSR adapter,
including draft/published switching, invalid/expired token rejection, noindex,
no-store, frame policy and static-artifact exclusion of preview code.

**Pass:** saved draft appears in protected preview without exposing API tokens.
**Fallback:** open preview in a protected new tab without iframe embedding; do
not make the production Landing SSR.

### S4 — Publish delivery reliability (1 day)

Test publish, unpublish, delete, bulk edits and media changes. Measure event
ordering and duplicate behavior, prove coalescing, replay rejection, retry and
Vercel Deploy Hook failure handling. Confirm the published snapshot is visible
when the build begins.

**Pass:** one content burst produces one deploy request; duplicate delivery is
safe; drafts never trigger public deploys; previous production remains intact
on build failure.

### S5 — Self-host restore and upgrade rehearsal (1 day)

Build the production container, restore PostgreSQL plus media into a clean
environment, rotate tokens/secrets and rehearse one Strapi patch upgrade.

**Pass:** documented recovery point/time targets are achievable and rollback
uses a known image plus compatible backup.

## 10. Delivery phases

### Phase M0 — Decisions and spike evidence

- Confirm deployment target, PostgreSQL and media provider.
- Run S1–S5 and record evidence next to this plan.
- Freeze the Strapi minor version for migration.
- Approve the snapshot contract and publish semantics.

### Phase M1 — CMS foundation

- Create `apps/cms` with configuration, health endpoints, Docker assets and
  test harness.
- Define content types/components in source control; never create production
  schema only through an untracked admin action.
- Add least-privilege API roles/tokens and environment validation.
- Configure PostgreSQL, media provider, backups and proxy policy.

### Phase M2 — Contract and Strapi source

- Add narrow `@mini-workout/contracts` CMS DTOs if S2 confirms the custom
  snapshot endpoint.
- Add `StrapiContentSource` and `LANDING_CONTENT_SOURCE=strapi` while retaining
  `fixtures|sanity` for rollback.
- Add provider mapper, pagination/limits, timeout and stable error mapping.
- Run fixture-versus-Strapi semantic parity and static build gates.

### Phase M3 — Editorial preview

- Configure Strapi Preview routes for supported content types.
- Replace Sanity preview-secret validation with the signed Strapi preview
  session.
- Remove visual-editing/stega only after Strapi preview acceptance passes.
- Verify preview CSP/frame origins, deployment protection and safe redirects.

### Phase M4 — Publish automation

- Implement the Level 1 webhook path and run S4.
- Add HMAC/outbox hardening before broad editor access unless the risk is
  explicitly accepted for an MVP window.
- Connect sanitized observations and operational runbook.
- Ensure publish/unpublish changes sitemap, canonicals and status behavior.

### Phase M5 — Content migration and parity

- Export Sanity data into a provider-neutral intermediate representation.
- Transform and import Strapi documents in dependency order: authors/categories,
  media, articles/campaigns/pages, then singletons/navigation.
- Preserve slugs, section order, schedules, SEO fields, media metadata and
  relationships; do not preserve vendor IDs as route identity.
- Compare counts, route inventory, semantic snapshots and rendered HTML.
- Content editors approve preview and representative production candidates.

### Phase M6 — Cutover and rollback window

- Deploy Strapi and seed production.
- Switch a protected Landing candidate to `LANDING_CONTENT_SOURCE=strapi`.
- Run build, crawl, canonical, JSON-LD, accessibility and visual checks.
- Switch production only after parity acceptance.
- Keep Sanity read-only, its adapter and prior env values for a 7–14 day
  observation window. Rollback is an environment source switch plus redeploy.

### Phase M7 — Decommission

- Remove `apps/studio`, Sanity packages, GROQ queries, preview integrations,
  environment variables and provider-specific CSP/docs.
- Rename/update service dashboards and runbooks.
- Re-run repository-wide format, lint, type checks, unit/integration tests,
  static/preview builds and Landing E2E.
- Archive the migration export and close Sanity only after rollback expiry.

## 11. Test and verification strategy

Required automated evidence:

- Schema tests for every CMS DTO and Dynamic Zone discriminator.
- Mapper golden tests against current reviewed fixture snapshots.
- Contract tests for published-only and draft preview responses.
- Snapshot endpoint authorization, pagination/limit, invalid relation and
  provider failure tests.
- Preview signature, expiry, replay, safe redirect, cookie, noindex/no-store and
  deployment-protection tests.
- Publish event allowlist, duplicate, retry, coalescing and build-trigger tests.
- SEO route inventory, canonical, robots, sitemap, JSON-LD and internal-link
  tests using Strapi-sourced builds.
- Self-host smoke, backup restore and patch-upgrade rehearsal.

Baseline repository commands remain `pnpm format`, `pnpm lint`,
`pnpm check-types`, `pnpm test`, production/preview Landing builds and Landing
Playwright journeys. Add focused `@mini-workout/cms` scripts rather than ad hoc
commands.

## 12. Risks and controls

| Risk                                          | Control                                                                         |
| --------------------------------------------- | ------------------------------------------------------------------------------- |
| CMS schema drifts from Landing                | Versioned transport DTO, validation in both runtimes, parity tests              |
| Dynamic Zone query silently omits nested data | Explicit Document Service population and representative contract tests          |
| Publishing creates deploy storms              | Publish-only allowlist, debounce/coalescing, idempotency/outbox                 |
| Draft/token leaks                             | Protected preview origin, server-only scoped tokens, signed short-lived session |
| Strapi outage affects public traffic          | Static public artifact; dependency used only for build/preview                  |
| Build fails after publish                     | Previous deployment remains live; visible queued/failed operational status      |
| Container loses media                         | External object storage or persistent volume plus independent backup            |
| Self-host security/upgrade burden             | Pinned images, secret rotation, patch cadence, restore/upgrade rehearsals       |
| Free-plan feature mismatch                    | Use full-screen Preview; exclude paid Live Preview/Review Workflows from MVP    |
| Sanity removal blocks rollback                | Dual-source period and delayed decommission                                     |

## 13. Acceptance criteria

Migration is complete only when:

1. Editors can create, validate, save, preview, publish and unpublish every MVP
   content type from Strapi.
2. Draft content never appears in a public build; published content appears only
   after a successful static deployment.
3. Strapi and fixture/Sanity semantic snapshots match for the migration corpus.
4. Public pages remain static and pass existing SEO, performance, accessibility
   and internal-link gates.
5. Preview is protected, server-token-only, noindex and uncached.
6. Publish delivery is authenticated, replay-safe, idempotent/coalesced and
   observable, or any temporary Level 1 limitation is explicitly timeboxed.
7. PostgreSQL and media backup restoration is proven.
8. Production cutover has a tested environment-switch rollback.
9. Sanity is removed only after the observation window closes.

## 14. Inputs required before M0 implementation

Recommended defaults are listed so implementation can proceed quickly once
approved:

1. **Hosting shape:** one Docker host/PaaS service for Strapi plus managed
   PostgreSQL (**recommended**) versus self-managing both application and DB.
2. **Media:** S3-compatible object storage with CDN (**recommended**) versus
   Cloudinary or durable local volume.
3. **Domain:** keep `studio.mini-workout.com` for both `/admin` and `/api`
   (**recommended for MVP**) versus separate Admin/API origins.
4. **Publish hardening:** build Level 1 then immediately Level 2 before cutover
   (**recommended**) versus accepting bearer-only webhooks for a timeboxed MVP.

## 15. Reference basis

- [Astro: Strapi CMS integration](https://docs.astro.build/en/guides/cms/strapi/)
- [Strapi: Preview](https://docs.strapi.io/cms/features/preview)
- [Strapi: Webhooks](https://docs.strapi.io/cms/backend-customization/webhooks)
- [Strapi: API tokens](https://docs.strapi.io/cms/features/api-tokens)
- [Strapi: REST population and field selection](https://docs.strapi.io/cms/api/rest/populate-select)
- [Strapi: REST filters and draft/published status](https://docs.strapi.io/cms/api/rest/filters)
- [Strapi: Docker/self-hosting](https://docs.strapi.io/cms/installation/docker)

## 16. Implementation progress — 2026-09-30

### Completed

- Scaffolded `apps/cms` on Strapi 5.55.1 and pinned Node 22/pnpm 10 support.
- Added source-controlled schemas for every MVP domain and native Draft &
  Publish state.
- Added versioned Dynamic Zone components and fail-closed provider mapping.
- Added separately permissioned published and draft snapshot endpoints.
- Added `StrapiContentSource` without changing Astro page/view-model ownership.
- Added the narrow `@mini-workout/contracts` runtime package and made both
  Strapi and Astro parse the same `LandingSnapshotV1` Zod envelope. Document
  details continue through Landing's stricter SEO/media/slug/link validators.
- Added `LANDING_CONTENT_SOURCE=strapi` while retaining fixture/Sanity rollback.
- Added signed, expiring Strapi Preview URLs and an HttpOnly Astro preview
  session. Sanity visual-editing code is excluded from Strapi preview builds.
- Added a multi-stage self-host Docker definition, production environment
  validation and an operational README.
- Added the Level 1 Strapi publish delivery path: authenticated and bounded
  webhook input, event/model allowlists, replay-window validation, duplicate
  suppression, a constrained Vercel Deploy Hook destination, stable public
  errors and sanitized service observations.
- Added M5 offline migration foundations: a versioned provider-neutral manifest,
  deterministic fixture exporter and a non-mutating Strapi import planner. The
  planner orders authors/media, categories, related documents and singletons,
  uses stable business keys and blocks unsafe apply when required content or
  media binaries are missing.
- Verified Strapi typecheck/lint/tests/admin build and local start/health on
  Node 22.20.0. Verified Landing typecheck/lint and 277 tests, CMS 10 tests,
  shared contracts 8 tests, static fixture build and Strapi preview SSR build.

### Evidence and discoveries

- Strapi started with its Community plan in roughly 0.8–1.3 seconds locally;
  `/_health` returned `204`.
- Both snapshot routes return `403` anonymously, proving that Public access is
  not enabled by default.
- pnpm production deploy successfully created a portable production dependency
  bundle. The final Docker build is not yet run because the workstation had
  only about 5 GiB free after Strapi installation; image-build verification
  remains part of S5.
- pnpm 10 required a narrow native-build allowlist for Strapi/Prisma/SWC rather
  than a global lifecycle-script bypass.
- The contract package emits ESM for Astro and CJS for Strapi, so the shared
  runtime validator works across both module systems without source imports or
  cross-app coupling.
- The reviewed fixture corpus currently has one Category, one Article, two local
  media assets and site shell content, but no Pricing singleton. The planner
  exposes these as explicit M5 blockers instead of creating a partial CMS state.

### Open gates

- Verify Cloudflare R2 upload/read/delete against the deployed CMS and rehearse
  media restore. Provider configuration, production validation and team setup
  documentation are implemented offline.
- Create production-like PostgreSQL and run restore/upgrade rehearsal (S5).
- Seed/import all content, create scoped API tokens and run an authenticated
  snapshot/semantic parity build (S2 completion).
- Deploy CMS plus protected Astro preview and exercise the real Admin Preview
  handshake (S3 completion).
- Exercise the Level 1 publish webhook against deployed Strapi and Vercel.
  Replace process-local duplicate suppression with the Level 2 durable
  HMAC/outbox/coalescing path before broad editor access (S4 completion).
- Run the idempotent apply client against a production-like Strapi service after
  adding the missing reviewed Pricing corpus, then run semantic parity. The
  offline client, dry-run, revision confirmation and duplicate prevention are
  implemented and an authenticated local HTTP apply-twice rehearsal passes.
  Perform M6 cutover/rollback and M7 decommission afterward.

### Rough progress

- M0 spikes/decisions: **55%** — runtime and contracts proven; infrastructure
  restore, real preview and publish delivery remain.
- M1 CMS foundation: **88%** — schemas/runtime/container and R2 provider
  configuration are complete; deployed storage and infrastructure proof remain.
- M2 contract/source: **88%** — the shared versioned runtime contract, provider
  mapping and unit evidence are complete; authenticated live snapshot parity
  remains.
- M3 preview: **65%** — signing/session/integration complete; deployed iframe
  handshake remains.
- M4 publish automation: **45%** — Level 1 authenticated delivery and tests are
  complete; deployed proof and durable Level 2 delivery remain.
- M5 content migration: **70%** — contract/export/planning, blocker reporting,
  durable storage configuration, local binary resolution/checksums,
  CMS-controlled pricing visibility, guarded idempotent apply tooling and local
  HTTP apply-twice proof are complete; approved Pricing input, deployed staging
  rehearsal and semantic parity remain.
- M6–M7: **0%**.
- Strapi migration overall: **about 65%**. Existing Landing UI/SEO foundation
  remains about **95%** complete.
