# Strapi 5 + Astro Landing Migration Plan

**Status:** Approved; M1 foundation and M2 adapter implemented; M3 preview code
implemented pending deployed handshake; M4 Level 2 durable delivery implemented
locally pending deployed proof; M5–M7 remain open
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

Recommended production topology. All hostnames are deployment configuration,
not application constants; supply each origin through the environment for the
target environment:

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

- Implement durable HMAC/outbox delivery with event allowlists, retry,
  coalescing and replay protection; run S4 before broad editor access.
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

1. **Database and media target — confirmed 2026-09-30:** retain SQLite and local
   uploads for development; production uses PostgreSQL and Cloudflare R2. This
   selects the database/provider target but does not select the hosting vendor.
2. **Hosting shape:** one Docker host/PaaS service for Strapi plus managed
   PostgreSQL (**recommended**) versus self-managing both application and DB.
3. **Domain:** confirmed env-driven 2026-10-01. No hostname is fixed by the
   application or this plan. Configure public Landing, CMS, API and preview
   origins per environment using `LANDING_SITE_URL`, `PUBLIC_URL`,
   `STRAPI_API_URL` and `LANDING_PREVIEW_URL` respectively. A single CMS origin
   for `/admin` and `/api` remains the recommended MVP topology, but the origin
   itself is configurable.
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

### Local M5 continuation verification — 2026-09-30

The fixture exporter and planner ran against a fresh local manifest. Both local
media binaries resolved and passed type/size/path validation with SHA-256
checksums. Apply correctly remains blocked by `REQUIRED_PRICING_MISSING`; no
synthetic Pricing was added to the migration manifest. The authenticated
apply-twice HTTP rehearsal passed (2/2 tests), CMS suite passed (34/34), and
the Astro static plus protected preview build rehearsal passed with two
authenticated snapshot requests and one preview request. The resolver exited
with its documented blocker status (`2`) because approved Pricing is not yet
available. This does not authorize or evidence a remote apply, R2 account
operation, PostgreSQL restore, or deployment cutover.

### Local phase checkpoint — 2026-10-01

Repeated the local-first verification with no external credentials or writes:

- CMS suite: **34/34 tests passed**, including authenticated HTTP apply-twice
  and invalid-token-no-mutation checks.
- Landing suite: **292/292 tests passed**, including Strapi source,
  fixture-parity, manifest merge, preview and publish-delivery contracts.
- Strapi build rehearsal: static build and protected Vercel preview build both
  passed; two authenticated snapshot requests and one preview request were
  observed. Astro's SSR build reports that `getStaticPaths()` is ignored for
  dynamic pages in server output; that is expected for protected on-demand
  preview routes, while the public artifact remains static.
- No Product/Legal-approved Pricing payload is present in the repository.
  `REQUIRED_PRICING_MISSING` therefore remains an intentional apply blocker.

No production phase is claimed complete by these local checks. M5 still needs
approved Pricing and an authenticated apply/parity run against the eventual
selected deployed environment; the same workflow will use environment
configuration rather than staging-specific code or infrastructure. M6–M7
remain unstarted until deployment, cutover and observation-window inputs exist.

### Product- and Legal-approved Pricing payload — 2026-10-01

Product supplied the Pricing singleton and confirmed the plan values; Legal has
now approved the cancellation and refund wording. Kept USD
$23.99/month and $240/year. The annual discount against twelve monthly payments
is approximately 16.63%, so the annual summary, FAQ and entitlement now say
"about 17%"; the annual FAQ states $240/year ($20/month). Merged the payload
into a fresh fixture manifest and ran the import planner plus media resolver.
The pricing contract validated, both local media assets resolved, and the
resolver reported `readyToApply: true`. The corrected approved payload is kept
in the ignored local file `apps/cms/.tmp/approved-pricing.json`; the merged
manifest is `/tmp/landing-approved-pricing-manifest.json`.

The user approved applying this exact payload to local Strapi. The first local
Strapi startup confirmed SQLite at `apps/cms/.tmp/data.db`, but the instance has
no administrator yet and `STRAPI_MIGRATION_TOKEN` is not configured, so no API
request or content write was made. After the user creates the initial local
administrator and a temporary narrowly scoped migration API token, continue
with local dry-run, apply, repeat-apply, snapshot verification and semantic
parity. Keep the token outside source control and revoke it after migration.

Staging remains environment/configuration parity only: no staging-specific code
or infrastructure is planned. A deployed parity check remains a later release
gate, using the same workflow with that environment's variables when an actual
deployment target is selected.

### Local migration API and apply-gate checkpoint — 2026-10-01

Started Strapi 5.55.1 against local SQLite and confirmed the user's migration
URL/token are configured locally without printing the token. The first
read-only dry-run exposed two local integration defects before any content
write: resolved media-only blockers were still treated as blocking by the apply
command, and the content-type schemas had no REST routers registered. Added a
regression test and fixed readiness to clear only media blockers validated by
the resolver; non-media blockers and resolver issues still stop apply. Added
Strapi core routes/controllers/services for the content types supported by the
manifest, limiting routes to read/create/update operations (no delete routes).
CMS type-check, Strapi production build and focused migration tests passed.

The initial permission check found missing Custom token scopes; this was an
interim checkpoint and is superseded by the continuation below. Public access
remains disabled; no Public-role permissions are to be added.

### Local apply and draft parity continuation — 2026-10-01

The user updated the temporary Custom token with `find/create/update` for
Author, Category and Article; `find/update` for Pricing Page, Site Setting and
Primary Navigation; and `find/upload` for Upload. The permissioned dry-run
passed on local Strapi at manifest revision
`7c8b56d66faa22fd7a7f8893c69faae4b4b0992bda1648d60f1ee7bdc11e7ac1`:
zero creates, six updates and two media reuses. Local apply completed with the
same totals; it updated the existing local documents and did not create
duplicates or upload the two existing assets again.

The first semantic draft-snapshot check exposed a media URL mismatch: Strapi's
local provider returns `/uploads/...`, while Landing previously accepted only
site-local images and Sanity CDN URLs. Landing now resolves Strapi-local upload
paths against the configured Strapi API origin; media validation accepts HTTPS
provider URLs and only loopback HTTP URLs under `/uploads/`. The parity
comparator now compares ordered section types and navigation labels/paths,
without comparing generated Strapi component IDs to source `_key` values.
Regression tests preserve section/link order and reject non-loopback HTTP,
credentials in media URLs and unsafe schemes.

The authenticated local draft snapshot mapped successfully and matched the
approved merged manifest semantically: one Article, one Category, Pricing
present, no issues. At that checkpoint, content had not yet been published and
the published endpoint returned `503`. No staging/production endpoint was
contacted. Use the same environment-driven workflow for any later deployed
target; no staging-specific code or infrastructure is introduced.

Follow-up schema fix: Strapi's shared internal-link regex now allows safe
fragments such as `/#ways-to-move`, matching the existing Landing validator;
regression tests continue to reject external, traversal, query and unsafe
fragment values.

### Local published parity and static build — 2026-10-01

After the user published Article, Category, Pricing Page, Site Setting and
Primary Navigation in local Strapi, the authenticated published snapshot
returned HTTP `200` with schema version `1`, one Article, one Category, Pricing,
Site Settings and Primary Navigation present, and no Campaign/Marketing Page
entries in the approved manifest. Semantic parity against the approved merged
manifest passed with zero issues. The static Astro build using
`LANDING_CONTENT_SOURCE=strapi` and the local Strapi read credential passed and
generated Home, Article, Category and Pricing pages plus the supporting 404
page. `/pricing/` is emitted only when published Pricing is present, and the
sitemap includes its approved canonical path. The output contains the approved
Pricing title and annual plan. Following the Product decision, local Strapi
Primary Navigation was updated and published with a `Pricing` link to
`/pricing/`, preserving the existing links and CTA labels. The authenticated
published snapshot returned HTTP `200` and confirmed all three navigation
links; the Strapi-backed static build passed again and generated `/pricing/`.
The approved local parity baseline was updated to include this Product-approved
navigation link, and the authenticated semantic parity check passed again.
The built artifact was served locally and the user confirmed the Landing UI.
Only local SQLite/uploads and build artifacts were involved; nothing was
deployed.

### Local CMS container build and runtime smoke — 2026-10-01

Built `mini-workout-cms:local` successfully from the repository root. The first
build exposed missing workspace contract inputs and incorrect assumptions about
Strapi output paths; the Dockerfile now builds `@mini-workout/contracts` before
CMS, and copies Strapi's actual `.strapi/client` and `dist` outputs into the
portable production bundle. The image starts the installed Strapi CLI directly
so startup does not invoke Corepack or resolve/download a package manager.
Dockerfile regression tests cover those workspace inputs, artifact paths and
startup command.

The resulting image started locally against an ephemeral SQLite database with
throwaway secrets and local uploads; Strapi reported healthy startup and
`GET /_health` returned `204`. The container and temporary database were
removed after the smoke test. This verifies local image packaging and process
startup only: production PostgreSQL, R2 credentials, persistent volumes,
backups/restores and a deployed healthcheck remain open gates.

### M4 Level 2 local implementation addendum — 2026-09-30

**Scope:** implement durable publish delivery locally before any deployed
handshake. Strapi is the source of publication events and owns a PostgreSQL
outbox (SQLite in local development). A Strapi event-hub subscriber persists
allowlisted post-commit events. A polling worker coalesces ready rows, signs a
bounded JSON batch with HMAC, sends it to the protected Landing preview
webhook, and retries failed deliveries with bounded exponential backoff.
Landing verifies the timestamp, delivery ID and raw-body signature before
triggering the existing constrained Vercel Deploy Hook.

**Decision:** use Strapi's post-commit Document Service event hub as the
publication signal. Persist only allowlisted event, model UID, stable entry
identity and timestamps; do not persist or transmit authored content. Use one
outbox row per source event and a lease so a worker restart reclaims unfinished
work. It waits for five seconds of inactivity and deduplicates event type/model
pairs in each bounded batch. Batch identity is deterministic from sorted
outbox row IDs. This gives
durable at-least-once delivery; Landing's replay guard remains best-effort in
the current serverless process and Vercel may accept a duplicate Deploy Hook if
an acknowledgement is lost. A durable receiver-side idempotency store is a
separate deployment integration gate before broad editor access.

**Acceptance criteria:** local SQLite records only allowlisted publication
events; duplicate event identities do not create duplicate rows; unsent events
coalesce into one signed batch; Landing rejects missing, malformed, stale,
tampered and replayed HMAC deliveries; transient network/non-2xx failures
retain events and schedule retry; successful delivery marks the batch complete;
no token, signature, request body or content copy enters logs/telemetry.

**Verification:** CMS and Landing focused tests, then both workspaces'
format/lint/type checks and CMS production build. Use Node 22.12+; local tests
must use SQLite/fakes and localhost only, with no external service or secrets.

**Verification result — 2026-09-30:** CMS tests **34/34 passed** and Landing
tests **292/292 passed** on Node 22.20.0. Both workspaces' format, lint and
type checks passed; `pnpm docs:check` and `git diff --check` passed. Strapi
production build passed TS compilation and admin-panel build. Strapi printed an
optional preferences-file `EPERM` warning for
`~/Library/Preferences/com.strapi/config.json`; the build still exited 0.
Local SQLite integration covered burst coalescing, duplicate identity,
lease recovery after expiry, retry scheduling and completion. Landing tests
covered HMAC validation, stale/tampered requests, replay suppression, batch
acceptance, safe error mapping and deploy-hook retry behavior.

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
- Added the Level 2 local durable publish path: Strapi's post-commit event hub
  writes allowlisted records to a PostgreSQL/SQLite outbox; a leased worker
  coalesces, HMAC-signs and retries delivery; Landing verifies raw-body HMAC,
  timestamp and delivery ID before triggering a deployment. The in-memory
  replay guard is warm-instance protection only; cross-instance durable
  idempotency remains a deployed gate.
- Added M5 offline migration foundations: a versioned provider-neutral manifest,
  deterministic fixture exporter and a non-mutating Strapi import planner. The
  planner orders authors/media, categories, related documents and singletons,
  uses stable business keys and blocks unsafe apply when required content or
  media binaries are missing.
- Added an authenticated local snapshot round-trip and repeatable Astro build
  rehearsal. The fixture corpus is exported through the provider-neutral
  manifest, served through Strapi-compatible published/preview endpoints,
  remapped into Landing view models, checked for semantic parity, and built as
  both static public and Vercel preview artifacts. Contract-only Pricing never
  enters the public fixture corpus or a migration manifest.
- Documented the exact Product/Legal Pricing approval payload and kept Pricing
  activation fail-closed until those real values are supplied.
- Replaced the Sanity-specific parity command with one provider-neutral gate
  for fixtures, Sanity and Strapi. It can use either the original fixture
  baseline or an approved migration manifest, which prevents reviewed Pricing
  additions from being misclassified as drift.
- Added a non-mutating Pricing approval merge command. It validates the source
  manifest and the full Landing Pricing contract, rejects existing Pricing with
  `RESOURCE_CONFLICT`, emits only a new manifest on stdout and uses sanitized
  stable error codes.
- Verified Strapi typecheck/lint/tests/admin build and local start/health on
  Node 22.20.0. Verified Landing typecheck/lint and 289 tests, CMS 10 tests,
  shared contracts 8 tests, static fixture build and Strapi preview SSR build.

### Evidence and discoveries

- Strapi started with its Community plan in roughly 0.8–1.3 seconds locally;
  `/_health` returned `204`.
- Both snapshot routes return `403` anonymously, proving that Public access is
  not enabled by default.
- pnpm production deploy successfully created a portable production dependency
  bundle. The local Docker image build and SQLite startup/health smoke now pass;
  the smoke does not count as PostgreSQL/R2 or deployed-environment evidence.
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
- Exercise the Level 2 HMAC/outbox delivery against deployed Strapi and Vercel.
  Prove coalescing, retry and cross-instance duplicate behavior before broad
  editor access (S4 completion).
- Run the idempotent apply client against the selected deployed Strapi target,
  then run semantic parity. Product/Legal approval, local apply, publication,
  Pricing navigation and local parity are complete. The local payload and
  media resolver report no blockers. The offline client, dry-run, revision
  confirmation and duplicate prevention are implemented and an authenticated
  local HTTP apply-twice rehearsal passes. The deployed apply/parity gate remains
  dependent on the hosting/environment decision. Perform M6 cutover/rollback
  and M7 decommission afterward.

### Rough progress

- M0 spikes/decisions: **55%** — runtime and contracts proven; infrastructure
  restore, real preview and publish delivery remain.
- M1 CMS foundation: **88%** — schemas/runtime/container and R2 provider
  configuration are complete; deployed storage and infrastructure proof remain.
- M2 contract/source: **88%** — the shared versioned runtime contract, provider
  mapping and unit evidence are complete; authenticated local published
  snapshot parity passes, while deployed snapshot proof remains.
- M3 preview: **65%** — signing/session/integration complete; deployed iframe
  handshake remains.
- M4 publish automation: **70%** — durable HMAC/outbox, coalescing, retry and
  local tests are complete; deployed proof and receiver-side idempotency remain.
- M5 content migration: **88%** — contract/export/planning, blocker reporting,
  durable storage configuration, local binary resolution/checksums,
  CMS-controlled pricing visibility, guarded idempotent apply tooling, local
  HTTP apply-twice proof, semantic snapshot round-trip and both Astro delivery
  builds, provider-neutral parity and guarded Pricing merge are complete;
  Product- and Legal-approved Pricing is applied locally; user-reviewed
  publication, published snapshot parity, conditional `/pricing/` route and
  sitemap activation, and the Strapi-backed static Landing build pass. A
  deployed parity gate remains for the eventual release target.
- M6–M7: **0%**.
- Strapi migration overall: **about 72%**. Existing Landing UI/SEO foundation
  remains about **95%** complete.
