# Landing Platform Architecture and Delivery Plan

**Status:** Architecture and MVP fallbacks approved; static foundation may proceed; preview/publish integration gates remain open
**Date:** 2026-09-22
**Owner:** Frontend / Growth Platform
**Decision class:** Cross-app architecture, content platform, experimentation, SEO

## 1. Executive decision

Create `apps/landing` as an independently deployable Astro application for
public acquisition content. Keep `apps/web` as the authenticated Next.js product
application and `apps/admin` as the operational TanStack Start admin.

Recommended production topology:

```text
example.com                    -> apps/landing
members.example.com            -> apps/web
admin.example.com              -> apps/admin
studio.example.com             -> hosted Sanity Studio
```

Recommended stack:

- Astro 7, TypeScript and Tailwind CSS 4 for static-first public pages.
- React 19.2 islands only where browser state or interaction is required.
- `@mini-workout/design-system` for shared brand semantics; use
  `@mini-workout/ui` selectively rather than making all Landing sections React.
- Sanity as the headless CMS and editor preview system.
- PostHog for analytics, feature flags and experiment analysis, behind a
  consent-aware app adapter.
- Vercel with independent projects for Landing and Web; re-evaluate Cloudflare
  only when edge economics or Workers-specific requirements justify a second
  platform.
- Playwright for public journeys, metadata/canonical checks and visual
  regression; Vitest for schemas, content mapping and experiment policy.

This separation is intentional. Marketing releases, CMS publication, cache
invalidation, SEO crawling and traffic spikes have a different lifecycle from
authenticated product releases and database/session availability.

## 2. Discovery findings

### Current system

- The monorepo already standardizes React 19.2, TypeScript 5.9, Tailwind CSS 4,
  pnpm and Turborepo. Astro adds a second frontend framework intentionally for
  a content-first workload.
- `apps/web` currently owns `/`, `/login`, `/register` and authenticated product
  routes. The root route checks the database-backed session and onboarding
  profile before rendering landing content.
- The root metadata only defines a title and description. No application-owned
  `robots.ts`, `sitemap.ts`, canonical policy, Open Graph/Twitter assets or
  structured-data policy was found.
- `apps/web` has Cache Components enabled, but the root acquisition route is
  coupled to per-request session reads and redirects.
- PostHog is already installed and wrapped by a consent-aware adapter. The
  adapter is currently focused on error capture/identity; it does not define a
  growth-event or experiment contract.
- Browser PostHog configuration in Web reads server-style environment names
  from a client module. Landing must define an Astro-specific, validated public
  configuration contract and must not copy this ambiguity.
- `apps/admin` manages product operations. It should not become a custom CMS in
  the first landing release.
- The worktree has unrelated in-progress Web/Core/E2E changes. Implementation
  must avoid modifying or reverting those changes accidentally.

### Problem classification

This is cross-cutting work involving Astro architecture, React islands,
external content data, static builds, preview SSR, analytics, privacy,
routing/deployment, SEO and browser testing.

### Scope

In scope:

- Public home, campaigns, pricing, articles and category SEO pages.
- Editorial workflow: draft, preview, schedule/release, publish and rollback.
- Controlled CTA/island A/B tests in the MVP; broader page/content experiments
  remain a follow-up behind CDN and SEO validation.
- Technical SEO, performance budgets, accessibility and observability.
- Migration of the public root from `apps/web` to `apps/landing`.

Out of scope for the first release:

- Rebuilding Sanity features inside `apps/admin`.
- Moving authenticated product pages, auth or product data into Landing.
- Personalizing crawlable SEO body content by user profile.
- An unrestricted drag-and-drop page builder or arbitrary editor-authored HTML.
- A generic `types` or `contracts` package without a second runtime consumer.

## 3. Architecture decision record

### ADR-1: Separate Landing deployable

**Decision:** Add `apps/landing`; do not continue growing the root landing page
inside `apps/web`.

**Why:**

- Public pages can prerender and cache without touching auth or PostgreSQL.
- A product outage or migration does not need to make acquisition pages fail.
- Marketing can publish content without releasing the product app.
- Independent analytics consent, CSP, scripts and performance budgets are easier
  to enforce.
- Traffic, ownership and release cadence can scale independently.

**Cost:** Another deployment, environment set and E2E server. Shared navigation
between domains becomes a real external boundary. Authentication cookies and
redirect URLs must be reviewed during domain migration.

**Rejected for target state:** A `(marketing)` route group in `apps/web` is a
reasonable short-lived MVP, but it retains deployment/runtime coupling and does
not satisfy the stated growth-platform direction.

### ADR-2: Use Astro for Landing

**Decision:** Use Astro 7 for `apps/landing`; retain Next.js for `apps/web` and
TanStack Start for `apps/admin`.

**Why:** The MVP is predominantly public, content-heavy and non-personalized.
Astro produces static HTML by default, minimizes browser JavaScript and provides
explicit hydration boundaries for the limited interactive areas. This makes the
desired SEO/performance architecture the default rather than a convention that
every contributor must remember.

**Cost:** The monorepo gains a second frontend framework, Astro adapter/runtime
configuration, Astro-specific tests and a more involved Sanity preview
integration. The technical spike in Section 9 must prove these costs are
bounded before implementation proceeds.

**Guardrails:**

- Primary content and page sections are `.astro` components by default.
- React is used only for genuine islands such as pricing controls, forms,
  calculators, media players, consent and experiment exposure.
- Do not add `client:*` hydration to a component without documenting the browser
  capability it requires.
- Do not turn production pages into SSR merely to support editorial preview.
- Do not force existing React UI primitives into Landing where semantic HTML and
  an Astro component are smaller and clearer.

### ADR-3: Sanity as CMS

**Decision:** Use Sanity for landing/editorial content, with a separately hosted
Studio and an Astro SSR preview surface.

**Why:** Structured schemas, references, image pipeline, draft/published
perspectives, Presentation/visual editing and the official Astro integration
match the marketing/content workflow without building a CMS in product admin.

**Alternatives:**

- Contentful is viable if procurement or the organization already standardizes
  it. Re-evaluate pricing, locale/release limits and preview workflow first.
- Payload is viable when self-hosting/data ownership is mandatory, but the team
  then owns CMS availability, upgrades, security and media operations.
- Markdown/MDX is insufficient for non-engineering campaign ownership and
  scheduled editorial workflows.

**Exit strategy:** Keep GROQ queries and Sanity value mapping inside
`apps/landing/src/lib/cms` and feature query modules. Astro components and React
islands consume validated app-owned view models, not raw vendor documents.

### ADR-4: Constrained section system, not free-form pages

Model pages as an ordered union of approved section types, for example:

```text
hero | logoCloud | valueProposition | featureGrid | testimonialSet |
workoutCollection | comparison | faq | richText | conversionCta
```

Every section has a schema version, explicit fields, design variants and
accessibility constraints. Editors can order approved sections and choose
supported variants, but cannot inject scripts, arbitrary CSS or arbitrary HTML.

This keeps design quality, Core Web Vitals, schema migrations and automated
testing manageable. Unknown section versions fail closed in preview and are
reported; production skips the invalid section and reports once without
bringing down the entire page.

### ADR-5: Separate content publication from experimentation

CMS documents define content and eligible variants. PostHog owns assignment,
exposure and experiment analysis. Do not encode experiment allocation logic in
CMS documents.

Experiment policy:

- The default, indexable page is complete and meaningful without JavaScript.
- Never show special content only to crawlers.
- MVP tests are limited to small CTA/island variants with reserved, equivalent
  layout. The control renders by default; variant assignment and exposure are
  enabled only after consent. If consent is absent, serve the control and do not
  emit experiment analytics.
- Do not change the indexable page title, description, `h1`, primary body,
  canonical, structured data or crawl directive in an MVP experiment.
- Tests that materially change indexable copy use stable variant URLs or
  platform rewrites, a canonical link to the control URL and temporary (`302`)
  redirects where redirects are used.
- Canonical, robots directives, structured data and primary page topic do not
  vary by experiment assignment.
- Assignment is sticky; exposure is recorded once only after the user actually
  sees the variant. Conversion events include experiment/variant identifiers
  from an allowlist and no PII.
- Tests have owner, hypothesis, primary metric, guardrail metrics, start/end
  dates, sample-size/stopping rule and cleanup date.

Do not read an experiment cookie in the top-level layout by default: it would
make otherwise cacheable pages request-dependent. For high-volume server-side
tests, prefer CDN/platform assignment and rewrites to separately prerendered
variant routes.

## 4. Target repository design

```text
apps/landing/
  src/pages/
    index.astro
    pricing.astro
    campaigns/[slug].astro
    articles/[slug].astro
    categories/[slug].astro
    api/draft-mode/enable.ts
    api/draft-mode/disable.ts
    api/health/live.ts
  src/layouts/
    site-layout.astro
    article-layout.astro
    preview-layout.astro
  src/features/
    marketing-page/
      components/*.astro
      marketing-page-queries.ts
      marketing-page-schema.ts
    campaign/
    article/
    category/
    pricing/
    seo/
    experimentation/
  src/components/
    sections/*.astro
    analytics/
    consent/
    navigation/
  src/islands/
    pricing/
    forms/
    experimentation/
  src/lib/
    cms/
      client.ts
      image.ts
      preview.ts
      query.ts
      view-models.ts
    analytics/
    env/
    observability/
  public/
  tests/
  docs/ARCHITECTURE.md
  astro.config.mjs
  package.json
  turbo.json
```

Sanity Studio should be a vendor-hosted project initially. If source-controlled
Studio configuration is required, add `apps/studio` as a separate workspace;
do not embed it into the public production route tree.

Dependency direction:

```text
apps/landing -> packages/ui -> packages/design-system
             -> packages/design-system directly
             -> packages/observability
             -> packages/core/errors (stable error contract only)
             -> config packages
             -> Sanity/PostHog adapters owned by apps/landing
```

`@mini-workout/ui` remains optional for React islands. Static Astro sections
consume design tokens and app-owned Astro components directly.

Landing must not depend on `@mini-workout/database`, `@mini-workout/auth` or
product repositories. If it imports `@mini-workout/core/errors`, Spike B must
prove the public subpath does not pull database runtime code into Landing. Links
to sign-up/login are external, environment-derived URLs targeting `apps/web`.

## 5. Content model

Minimum document types:

- `siteSettings`: brand defaults, organization data, default SEO and social
  images; singleton.
- `navigation` and `footer`: named menus with validated internal/external links.
- `marketingPage`: title, slug, lifecycle state, ordered sections, SEO fields,
  locale, publication dates and redirect predecessor.
- `campaignPage`: campaign identifier, audience description, start/end dates,
  acquisition metadata and sections.
- `article`, `author`, `category` and `topic`: required in the MVP for organic
  editorial and category SEO pages.
- Reusable `testimonial`, `faqSet`, `mediaAsset` and `cta` references where
  governance or reuse is real.
- `experimentContentVariant`: content references only; no allocation percentages
  or analytics credentials.

Required validation:

- Unique normalized slugs and reserved-path denylist.
- Required title/meta description and canonical policy.
- Image dimensions, focal point and meaningful alt text; explicit decorative
  image option.
- Link validation and safe protocols.
- Heading hierarchy represented structurally, not as arbitrary rich text.
- Schedule/end-date consistency and campaign expiry behavior.
- Locale fallback policy before localization is enabled.

Model evolution uses schema versions plus mapping functions. Do not render raw
Portable Text or URL fields without a controlled component map and protocol
validation.

## 6. Rendering, cache and publication flow

Production publication and read flow:

```text
Sanity publish -> signed webhook -> Vercel deploy hook -> Astro static build
               -> atomic CDN deployment

request -> static HTML/CDN -> Astro-rendered sections
        -> optional React islands for interaction only
```

- Production uses static output for home, pricing, campaigns, articles and
  categories. A CMS outage cannot remove already deployed HTML.
- A signed Sanity webhook triggers a new build. The deployment is atomic and the
  previous successful deployment remains the rollback target.
- Initial publication SLA is 2-5 minutes. Measure real build duration before
  agreeing a stricter SLA.
- Preview runs through a separate Astro server deployment, validates the Sanity
  preview URL secret, reads draft/release perspective and sets Sanity's secure
  perspective cookie. It is always `noindex` and uncached.
- The SSR preview deployment must be protected by Vercel Deployment Protection
  (or equivalent access control). The perspective cookie is a mode indicator,
  not a signed authorization token; a forged cookie can activate draft reads on
  an otherwise public SSR preview host. Never expose that host unprotected.
- Production and preview may be separate Vercel projects or separate deployment
  modes from the same source. The spike must prove the simplest secure option.
- CMS tokens never enter normal production HTML, client bundles or logs.
- Introduce selective on-demand rendering only after measured build time,
  activation precision or page volume makes full static deploys insufficient.
- Campaign expiry must be explicit: unpublish plus `410`, redirect to an
  evergreen successor, or retain an archived canonical page. Avoid silent soft
  404s.

## 7. SEO contract

Every indexable route must have:

- Unique title, description, canonical URL and crawl directive.
- Stable server-rendered `h1` and meaningful primary content.
- Open Graph and Twitter metadata with a deterministic image fallback.
- Correct `html lang`; `hreflang` and localized sitemap entries only when real
  translated pages exist.
- Breadcrumbs for nested editorial routes and valid JSON-LD chosen by page
  semantics (`Organization`, `WebSite`, `WebPage`, `Article`, `BreadcrumbList`,
  and `FAQPage` only where eligible).
- Sitemap entries sourced only from published/indexable documents, with real
  `lastModified` values; no experiment or preview URLs.
- Generated `robots.txt` excludes preview/internal paths but does not use robots
  as a duplicate-content strategy.
- Real 404/410 status for absent/expired pages; permanent redirects for approved
  slug migrations and temporary redirects for experiments.

Quality budgets at p75 field data, segmented mobile/desktop:

- LCP <= 2.5 s, INP <= 200 ms, CLS <= 0.1.
- Set an initial page JavaScript budget (target <= 120 KB compressed first-party
  JS on a standard content page) and revise using measured requirements.
- No client-only primary content and no analytics/CMS vendor scripts in the
  critical render path.
- Use Astro's image service or controlled Sanity image URLs, declared
  dimensions/aspect ratio, responsive `sizes`, local fonts and limited font
  weights.

Automated metadata tests are necessary but not sufficient. Pre-launch requires
rendered HTML inspection, Rich Results validation where relevant, Lighthouse
CI/synthetic checks and Search Console verification after release.

## 8. Analytics and privacy contract

Define a small typed event vocabulary before adding tracking:

- `landing_page_view`
- `campaign_view`
- `cta_clicked`
- `signup_started`
- `experiment_exposure`
- `content_engaged` only with a precise threshold definition

Required properties are allowlisted: route template, campaign ID, content ID,
CTA ID, experiment key, variant key, referrer class and UTM values after length
and character validation. Never send free-form form fields, email, full URL
query strings, auth tokens or CMS draft data.

Use a conservative global baseline: non-essential analytics and experimentation
start only after consent, the site remains fully usable after denial, consent is
versioned and the banner reserves layout space. Product/legal must still approve
jurisdictions, retention and exact copy. Analytics failure is always best-effort
and must not fail navigation or conversion.

Do not share the Product auth cookie across `.example.com`. MVP attribution is
aggregate-only: measure consented Landing campaign/CTA activity and Product
conversion totals separately, without joining a Landing identity or campaign to
an individual Product signup. Do not pass attribution tokens or user-level
campaign payloads to Product in the MVP. Revisit a privacy-safe exchange only
after an explicit product/privacy decision and a dedicated replay/logging test.

Start with one primary locale at root paths. Keep schemas locale-aware, but do
not add `/vi`, `/en` or `hreflang` until a second locale has complete translated
content, editorial ownership and support. Avoid speculative locale URL churn.

Every HTTP boundary—preview enable/disable, publish webhook and health—uses the
repository error convention: validate untrusted
input, classify with stable codes, attach/return `x-request-id`, map expected
errors safely, report unexpected errors once at the outer boundary and keep
telemetry best-effort. Never log tokens, cookies, raw query strings, request
bodies, email or CMS provider details. Boundary tests cover expected status
mapping, generic unexpected fallback, retry policy, replay/tampering, reporter
failure, redaction and duplicate-report prevention.

## 9. Delivery plan

### Phase 0 — Risk-reduction spikes

Spikes are disposable, evidence-producing investigations. They are not the
foundation to quietly evolve into production. Put spike code under a temporary
branch or `apps/landing-spike`; retain the written findings, measurements and
minimal reproducible examples, then delete or explicitly rewrite prototype code.
Each spike has a timebox, owner, hypothesis and binary decision gate. If a gate
fails, update this ADR before starting the phase that consumes that capability;
an unresolved preview gate does not block the independent static foundation.

Initial local evidence and unresolved gates are recorded in
[`2026-09-23-landing-spike-a-results.md`](2026-09-23-landing-spike-a-results.md),
[`2026-09-23-landing-spike-b-results.md`](2026-09-23-landing-spike-b-results.md),
[`2026-09-23-landing-spike-c-results.md`](2026-09-23-landing-spike-c-results.md),
[`2026-09-23-landing-spike-d-results.md`](2026-09-23-landing-spike-d-results.md),
[`2026-09-23-landing-spike-e-results.md`](2026-09-23-landing-spike-e-results.md)
and [`2026-09-23-landing-spike-f-results.md`](2026-09-23-landing-spike-f-results.md).
These reports are checkpoints, not approvals to start production implementation.

| Spike                      | Current evidence                                                            | Gate still needed                                                                               |
| -------------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| A — Astro + Sanity preview | Static/SSR builds and local route behavior pass                             | Real Sanity draft handshake; built Vercel runtime; Deployment Protection and Studio iframe flow |
| B — workspace UI/CSS       | Static CSS/island fixture and Node public-export resolution pass separately | In-workspace Astro/Vite build and boundary check                                                |
| C — static scale           | Synthetic 100/1k/10k route builds pass on local Node 25                     | Pinned Node 22 run, representative Sanity data/images, Vercel queue/deploy/rollback measurement |
| D — static A/B             | Static metadata invariants pass; CTA/island fallback approved               | Full-page/CDN assignment deferred beyond MVP                                                    |
| E — attribution            | Threat analysis complete; aggregate-only fallback approved                  | Individual-level exchange deferred beyond MVP                                                   |
| F — SEO/performance        | Static metadata/content and 79.4 KB gzip island-module estimate             | Sanity images, complete page transfer, Lighthouse/a11y and field CWV                            |

**MVP decisions are now recorded:** D uses the CTA/island-only fallback; E uses
aggregate-only reporting with no user-level cross-domain join. These fallbacks
close the Phase 0 decision gates for the MVP, while the full CDN experiment and
attribution protocols remain deferred.

**Phase 1–2 may start with the static foundation.** Spikes A and C do not block
the Astro workspace shell, SEO shell or static page work. They remain mandatory
before enabling Sanity draft preview, automated publishing, or promising the
2–5 minute publish SLA. Spike B's open workspace integration check must be
completed before adding the shared React UI dependency; until then, use
design-system CSS exports and Astro-native markup. Spike F's production budget
and launch checks remain required before rollout.

#### Spike A — Astro + Sanity preview architecture

**Timebox:** 3 engineering days.

**Question:** Can one source tree provide static production output and editorial
preview on a protected SSR deployment with acceptable complexity on Vercel?

**Prototype:**

- One campaign, one article and one category route.
- Three section types: hero, rich text and CTA.
- Published and draft perspectives, click-to-edit overlays and perspective
  changes in Sanity Presentation.
- Validated preview enable/disable endpoints, secure bounded cookies and
  deployment access protection for the SSR preview host. The perspective cookie
  is client-readable because Visual Editing updates it; keep it Secure,
  SameSite and short-lived, and never treat it as authorization. Strip secret
  query parameters before redirecting.
- Production build that contains no token/stega data and loads no
  Visual Editing client code.
- A publish webhook that triggers a preview/protected deployment build.

**Evidence:** architecture diagram, file/dependency inventory, production bundle
inspection, rendered HTML captures, security checklist, build duration and a
short editor screen recording.

**Pass:** editor preview updates reliably; production is static and clean;
preview host access is protected; invalid/expired secrets are rejected;
iframe cookies persist on supported browsers; secrets are removed from the final
URL; integration needs no forked vendor package or brittle global monkey patch
owned by the product team.

**Fail/fallback:** use Next.js for Landing if secure Astro preview remains
materially more complex or unreliable after the timebox. Do not weaken preview
security or ship a permanently SSR production site merely to preserve Astro.

#### Spike B — Monorepo UI and CSS interoperability

**Timebox:** 2 engineering days.

**Question:** Can Astro consume the shared Tailwind/design-system foundation
without duplicated CSS, broken content scanning or shipping unnecessary React?

**Prototype:** render an Astro Button/Card equivalent, one existing React UI
primitive without hydration and one interactive React island with hydration.
Test light/dark tokens, fonts, focus states and production CSS output.

**Evidence:** JS/CSS bundle comparison, accessibility scan, dependency graph and
documented rule for Astro component versus shared React component ownership.

**Pass:** a static content page has no React runtime; tokens render consistently;
hydrating one island does not hydrate its page ancestors; no source-path imports
or package-boundary exception is required.

**Fail/fallback:** keep only design tokens shared and build Landing-local Astro
primitives. Do not convert static sections to React to maximize code reuse.

#### Spike C — Static publication, scale and rollback

**Timebox:** 2 engineering days.

**Question:** Does rebuild-on-publish satisfy the 2-5 minute editorial SLA and
remain predictable at projected content volume?

**Prototype:** generate representative datasets at 100, 1,000 and 10,000 pages;
measure cold/cached builds, CMS query volume, artifact size and deployment time.
Simulate failed CMS fetch, failed build, concurrent publishes and rollback.

**Evidence:** benchmark table with CI-equivalent resources, cost estimate,
webhook coalescing proposal and thresholds that trigger hybrid/on-demand render.

**Pass:** projected 12-month content volume deploys inside the SLA with bounded
query/cost behavior; failed builds leave the previous site online.

**Fail/fallback:** selectively render volatile campaign routes on demand or move
to Next.js/tag invalidation. Do not introduce hybrid rendering without measured
need and an explicit cache contract.

#### Spike D — Static A/B assignment without SEO or CLS regression

**Timebox:** 3 engineering days.

**Question:** Can Vercel/CDN routing assign sticky variants over prerendered HTML
while preserving one public URL, canonical control and accurate exposure?

**Prototype:** control and variant static artifacts for one campaign; anonymous
sticky assignment; no-cookie/bot control; kill switch; consent-aware PostHog
exposure only after viewport visibility; preview-only forced variant.

**Evidence:** request/response traces, cache-key analysis, rendered canonical and
robots HTML for each path, CLS measurement and duplicate-exposure test results.

**Pass:** no content flash, canonical does not vary, assignment is stable,
control is served without cookies and exposure is recorded exactly once.

**Fail/fallback:** limit MVP tests to layout-reserved client islands or explicit
temporary variant URLs with canonical/302 policy. Do not make every request SSR.

#### Spike E — Cross-subdomain conversion attribution

**Timebox:** 2 engineering days.

**Question:** Can Landing attribution survive navigation to Product without a
shared auth cookie, PII in URLs or spoofable campaign properties?

**Prototype:** Landing creates/receives sanitized UTM data, issues an opaque
short-lived signed token, Product exchanges it server-side and associates it
with a test signup. Cover expiry, replay, tampering, consent denial and missing
JavaScript.

**Evidence:** sequence diagram, threat notes, payload/log inspection and E2E
trace with secrets/cookies disabled in retained artifacts.

**Pass:** no PII/raw analytics identity appears in URL or logs; token is bounded,
expiring and tamper-evident; signup works without the token; auth cookies remain
host-only.

**Fail/fallback:** use aggregate campaign conversion only until a privacy-safe
join exists. Never broaden the auth cookie domain to solve attribution.

#### Spike F — SEO, image and JavaScript budget baseline

**Timebox:** 2 engineering days.

**Question:** Can representative Astro pages meet the proposed output and CWV
budgets with Sanity images, consent and one React island?

**Prototype:** a realistic article and campaign with local fonts, responsive
images, JSON-LD, PostHog disabled/consented states and one interactive island.

**Evidence:** production bundle report, Lighthouse runs at mobile/desktop,
no-JavaScript crawl, image candidate inspection and accessibility report.

**Pass:** primary content exists without JavaScript; no hydration mismatch; the
standard page stays under the 120 KB compressed first-party JS ceiling and meets
the lab proxies for the stated p75 CWV targets.

**Fail/fallback:** remove/defer islands and third-party scripts, revise image/font
delivery and remeasure before accepting a higher budget.

#### Spike review gate

At the end of Phase 0, publish one spike report containing:

- decision and confidence for each hypothesis;
- measurements and reproducible commands;
- risks retired, risks remaining and explicit fallback selected;
- dependency/version pins and known vendor limitations;
- changes required to this execution plan.

Staff Frontend, Growth/Product, Content and Security/Privacy owners sign off the
relevant gates. The Phase 1–2 static foundation may start with the approved
fallbacks and the Astro-native/design-token-only boundary. Spike A must pass or
have an explicitly accepted secure fallback before Phase 3 preview/publishing
integration; Spike C must have representative evidence or an explicitly revised
publish SLA before automated publishing is enabled. Spike B must pass before
the shared React UI package is added. D/E are closed for MVP scope by the
fallbacks recorded above; broader variants or user-level attribution require
new spikes. Spike F's SEO/performance checks are a launch gate, not a scaffold
gate.

### Phase 1 — Workspace foundation

**Implementation status (2026-09-23):** In progress; Phase 1–2 foundation
commit prepared. Implemented: static Astro workspace, design-token CSS boundary,
validated canonical-origin environment, package scripts, Turbo build hashing,
fail-closed crawler policy, static SEO shell (layout, metadata, JSON-LD,
robots/sitemap/manifest and 404), and separate Landing browser coverage. The
Landing package, E2E project and CI-facing scripts are covered by workspace
format/lint/type/test/build checks. Astro file-level boundary enforcement and
the first CI artifact budget were completed on 2026-09-24; the production build
reported 0 B gzip JavaScript, 5,596 B gzip CSS, a 132,910 B largest asset and a
256,454 B total artifact. Not yet complete: brand-provided icon/social assets,
campaign-specific 410/expiry behavior, an isolated production-indexing build
case, and production domain/indexing rollout.
Preview/SSR and publish automation remain gated by Spikes A and C; do not treat
this foundation as launch-ready.

1. Scaffold `apps/landing` with package-local `dev`, `build`, `start`, `lint`,
   `format`, `check-types`, `test` and `test:coverage` scripts.
2. Register only required Turbo environment inputs/outputs. Root scripts remain
   delegators through `turbo run`.
3. Configure Astro static production output and Tailwind/design-system CSS.
   Defer the Vercel SSR adapter and preview-only integrations to Phase 3 after
   Spike A; add React integration only after Spike B or when a measured MVP
   island requires it.
4. Establish Landing feature-boundary ESLint rules and an initial
   Astro-native/design-token-only ownership rule. Add the shared React UI
   boundary only after Spike B passes.
5. Add validated server/public environment modules and `.env.example` without
   credentials.
6. Initialize observability with service name `landing`; defer runtime health
   routes until the server adapter is selected in Phase 3.
7. Extend E2E port/server orchestration with a distinct Landing project rather
   than renaming the existing Web public fixture in one large step.

**Tests:** config/env unit tests, boundary negative fixtures, health smoke and
desktop/mobile empty-shell E2E.

### Phase 2 — SEO and static shell baseline

1. Build root layout, semantic header/footer, skip link, focus behavior and
   responsive navigation.
2. Add reusable head/SEO component, canonical utility, generated `robots.txt`,
   sitemap, web manifest, icons and generated/static social fallback.
3. Add safe JSON-LD serializer that escapes `<` and accepts schema-owned view
   models only.
4. Establish adapter-appropriate 404/410, error and campaign-expiry behavior.
5. Add performance budgets and bundle inspection to CI.

**Tests:** rendered metadata/canonical/robots/sitemap, heading landmarks,
keyboard navigation, no-JS content, 404 status and structured-data snapshots.

**Next implementation slice:** finish the Phase 1–2 exit criteria before
starting CMS preview/publishing or production rollout:

1. Add Astro-aware lint/boundary checks so `.astro` files follow the
   Astro-native/design-token-only ownership rule and cannot silently import
   app internals across package boundaries.
2. Add automated rendered-output contracts for canonical/meta, JSON-LD,
   robots, sitemap URL membership, semantic landmarks, keyboard skip-link and
   no-JavaScript content. Include explicit production-indexing opt-in and
   default fail-closed cases.
3. Establish an initial compressed-JavaScript and static artifact budget in
   CI, then record a representative article/campaign baseline for Spike F.
4. Request approved brand icons/social fallback assets before closing the
   asset-dependent SEO items. Define campaign expiry/410 behavior when the
   campaign content model and retention policy are agreed; do not invent
   campaign URLs or expiry dates in the shell.
5. After these gates, proceed with Phase 3 schemas and published-content
   mapping against local fixtures. Keep preview endpoints and publish webhooks
   disabled until Spikes A/C pass or their fallbacks are explicitly accepted.

**Progress (2026-09-26):** Items 1 and 3 are implemented with negative fixtures
and CI wiring. Item 2 covers Home and Mobility canonical/meta, JSON-LD, sitemap,
landmarks, keyboard, no-external-JavaScript and fail-closed crawler behavior.
An isolated CI gate now builds both production fail-closed and explicit
production-indexing artifacts from the same source, then verifies that robots,
canonical and sitemap origins agree. Item 4 remains an explicit Brand/Content
input and campaign-retention decision.

**Phase 1–2 exit gate:** every item above is either implemented with tests or
recorded as an explicit input/gate with an owner; static output remains
noindex/disallowed by default, and the production indexing switch is exercised
only in an isolated build test.

### Phase 3 — CMS foundation and editorial preview

This phase may proceed in two subtracks. CMS schemas and published-content
mapping may be developed against local fixtures. Do not expose draft-preview
routes until Spike A's secure-preview gate passes (or a secure fallback is
explicitly accepted). Do not expose the publish webhook until Spike C has
representative build/deploy evidence or the team approves a revised SLA. Keep
both capabilities off the Phase 1–2 static deployment.

1. Create Sanity schemas and desk structure for settings, navigation, pages,
   campaigns and approved sections.
2. Implement server-only client, image builder, query modules and Zod/value
   mapping at the CMS boundary.
3. Build the section registry with exhaustive handling and versioned contracts.
4. Add signed preview-mode enable/disable routes and Presentation/visual editing
   using the architecture accepted by Spike A.
5. Add signed/coalesced publish webhook to trigger atomic static deployments;
   authenticate both Sanity and deployment-provider boundaries.
6. Document publish, rollback, broken-link and emergency-unpublish runbooks.

**Offline contract progress (2026-09-24):** The first Article and Category
documents now pass through app-owned unknown-input mappers with schema-version
gates, published/draft policy, shared slug/SEO/local-media/internal-link
validation, derived canonical paths and an exhaustive `prose.v1` /
`pullQuote.v1` Article section registry. Invalid published documents fail the
static build; drafts generate no route. This closes the Article/Category portion
of items 2–3 against local fixtures only. Sanity schemas/queries, Zod, preview,
webhooks, Campaign lifecycle and operational runbooks remain open and retain
their existing gates.

**Schema/query progress (2026-09-24):** An isolated `apps/studio` implements the
matching schema-v1 Article, Category, Author, SEO, image, internal-link and
versioned section definitions. Landing has published-only GROQ projections and
a provider boundary that maps results through the same contracts. Studio builds
with its own React 19.3 runtime; Web/Admin pins are untouched. Real dataset
activation, Zod adoption, preview/Presentation, webhooks and publish runbooks
remain open.

**Activation-readiness progress (2026-09-24):** Home, Article/Category static
paths and sitemap generation now share one cached content repository. Fixtures
remain the default. Explicit Sanity selection requires project/dataset config
and fails closed for provider or mapping errors with no stale-fixture fallback.
The real dataset parity/build gate remains open because the reachable dataset
does not yet contain the approved baseline content and assets.

**Parity-tooling progress (2026-09-24):** A fail-closed activation checker now
compares the mapped Sanity published snapshot with the reviewed fixture baseline
for route inventory, canonicals, SEO, Article/Category relationships, ordered
section identities and media dimensions. Output is limited to stable issue
codes and slug-scoped paths. Tooling is complete offline; real dataset content,
asset inspection and a Sanity-sourced build still require infrastructure.

**Studio authoring progress (2026-09-24):** The configured public project/dataset
is reachable and now contains the baseline Author, Mobility Category and
Article with real Sanity image assets. Studio provides task-oriented
Editorial/People desk groups, document previews and Landing-aligned
slug/internal-link validation. Public parity and a Sanity-sourced static build
pass; preview/webhook automation and approved launch content remain open.

**Real-dataset gate (2026-09-24):** The idempotent baseline workflow is dry-run
by default and never overwrites existing editor documents. A dotted-ID bootstrap
mistake was migrated to public root IDs, assets were reused, and the exact three
private legacy documents were removed only after replacement/parity checks.
Anonymous builds require no read token and fail closed on invalid CMS content.

**Site Shell progress (2026-09-24):** Site Settings and Primary Navigation now
have Landing-owned fail-closed contracts, published-only queries, repository
mapping and fixed-ID Studio singleton editors. Brand/footer copy and ordered
internal navigation are CMS-driven. Product sign-in/register destinations stay
architecture-owned so editorial changes cannot alter the product trust
boundary. Two public singleton documents were seeded idempotently; parity and a
Sanity-sourced static build pass. At this checkpoint Generic Page, Campaign and
Pricing were deferred; the later Campaign and Pricing sections below supersede
that status.

**Secure preview progress (2026-09-24):** One source tree now emits a static
public artifact or a separate Vercel SSR preview artifact. Preview-only routes
validate Sanity secrets, set a hardened one-hour perspective cookie and are
absent from static output. Request-scoped draft reads disable CDN caching and
reuse the fail-closed content mappers. All preview responses force `noindex` and
`private, no-store`; Studio Presentation resolves Home, Article and Category
locations with sharing disabled. The gate remains externally open for a valid
real-secret/draft handshake and Vercel Deployment Protection/bypass evidence.

**Visual Editing progress (2026-09-25):** The configured Viewer token now reads
the draft perspective successfully. Preview responses contain stega metadata
and load the Visual Editing client without browser console errors; the public
static artifact remains free of preview JavaScript. Studio-generated handshake,
iframe overlay interaction and Vercel protection/bypass remain deployment
evidence rather than local implementation work.

**Publishing workflow progress (2026-09-26):** A preview-only Astro route now
verifies Sanity's timestamped HMAC signature over the bounded raw body, requires
the provider idempotency key and triggers only an allowlisted Vercel Deploy Hook
origin. Expected authentication/input failures do not alert; configuration,
dependency and unexpected failures use the shared error contract, safe
request-ID responses and one best-effort report. Duplicate deliveries are
coalesced within a warm runtime and Vercel remains the documented MVP
cross-instance deploy-deduplication boundary. The publish, failed-build
rollback, broken-link and emergency-unpublish runbook is implemented. Real
Sanity delivery, Deployment Protection bypass, deploy timing and rollback
evidence remain activation gates; automation stays disabled until then.

**Generic Page progress (2026-09-29):** The remaining Phase 3 Page boundary now
supports a versioned `legal.v1` template with structured legal sections,
explicit effective date, reserved-root protection and fail-closed lifecycle,
slug, SEO and section mapping. Published pages participate in Sanity
published/draft queries, the shared repository, parity, sitemap, static root
routes, operational broken-link checks and protected Presentation. The fixture
inventory remains empty, so no placeholder `/privacy/` route or invented legal
copy is published. Legal approval and a real CMS document remain external
activation gates.

**Campaign contract progress (2026-09-27):** Landing now owns a fail-closed
schema-v1 Campaign mapper with stable campaign IDs, UTC start/end validation,
derived scheduled/active/expired lifecycle, mandatory `gone` / `redirect` /
`archive` expiry policy and a constrained versioned hero/benefits/FAQ/CTA
section registry. Sanity schema and published/draft GROQ projections mirror the
same contract, and Campaigns participate in the shared repository/parity
inventory. The fixture collection remains intentionally empty, so this work
creates no placeholder/indexable URL. The reusable Astro route/template and
deterministic delivery planner are now implemented: scheduled campaigns are
omitted, active campaigns render their conversion CTA, and archived campaigns
remain readable while suppressing conversion. Redirect and `410` policies now
emit validated Vercel Build Output API v3 routes from the same versioned
manifest used by the prerender pass. Live protected-preview status/header
evidence remains open. A real campaign and approved offer/legal copy remain
required before a public URL or Home promotion is emitted.

**Tests:** query mapper fixtures, invalid/unknown sections, webhook signature,
replay/coalescing behavior, preview authorization, preview `noindex`, no token or
stega leakage in production, failed-build rollback and CMS-outage static serving.

### Phase 4 — MVP pages and design system

**UI design proposal:** [Landing UI Design Proposal](./2026-09-23-landing-ui-design.md)
defines the shared visual direction and section contracts for Home, Campaign,
Pricing, Article and Category templates. Treat copy, campaign offers, prices,
category SEO inventory and production imagery as explicit content-owner inputs;
do not invent them while implementing the static prototype.

**Vertical-slice status (2026-09-24):** Home, the first Mobility category and a
related Mobility Article template are implemented against app-owned local
fixtures. Both editorial routes are included in static generation and sitemap
output, with controlled structured content and type-specific JSON-LD; other
categories and articles remain unpublished. This validates page composition,
cross-linking and SEO contracts but does not close the CMS, approved-content,
asset or remaining Phase 1–2 engineering gates.

**Campaign delivery status (2026-09-27):** A shared Astro campaign template now
renders the constrained hero, benefits, FAQ and conversion sections without
client JavaScript. Its injected-clock planner separates scheduled, active,
archived, redirect and gone outcomes; static paths and sitemap include only
renderable active/archive pages. Archive behavior is complete. Static builds
now produce a Build Output API artifact with Campaign `308`/`410` routes before
filesystem routing, while malformed manifests fail the build. A controlled
protected-preview deployment still needs to prove the live status/header
behavior. The fixture inventory remains empty pending approved campaign
content.

**Pricing foundation status (2026-09-27):** Landing now owns a schema-v1
Pricing singleton contract with exact minor-unit money, verified currency
exponent/locale, recurring or one-time cadence, stable plan IDs, ordered
entitlements, constrained Member CTA actions, at most one recommendation and
mandatory cancellation/refund copy. Sanity published/draft queries, repository
mapping, Studio validation and an Astro-only editorial comparison template are
implemented. The fixture remains `null`; `/pricing/`, sitemap and navigation
activation remain gated by approved commercial/legal content.

**Studio authoring hardening (2026-09-29):** Campaign composition now fails
early unless it has one first-position hero, unique section/nested item keys,
only versioned section types and at most one final CTA. Pricing currency, locale
and recurring/one-time billing errors surface at their owning fields while the
whole-document invariant remains in force. Deterministic document cards expose
Campaign schedule and Pricing plan/currency context; valid Campaign slugs now
open protected Presentation. Pricing Presentation stays gated with its public
route. Marketing/Content usability review and approved commercial content are
still external inputs.

**Content launch gate (2026-09-29):** A deterministic, scoped release command
now evaluates the validated published snapshot before Campaign/Pricing
activation. Campaign requires a currently active document and warns inside its
seven-day expiry window; Pricing requires the commercial singleton. Output is
sanitized and fail-closed, while the runbook keeps business/legal approval and
route/indexing activation as separate human gates.

**Legal page template status (2026-09-29):** A semantic, zero-client-JavaScript
Astro template now renders versioned Generic Legal Pages with an effective date,
document navigation and responsive long-form typography. The operational audit
requires the consent privacy link to resolve to a published page. The template
contains no fallback policy language or decorative asset; `/privacy/` remains
absent until Content/Legal publishes approved copy.

1. Implement approved page templates and section components from design specs.
2. Add new shared primitives to `packages/ui` only when both Landing and another
   app have a real reusable contract; add Storybook stories and a11y checks.
3. Implement responsive images and reserved media dimensions.
4. Seed representative home, campaign, pricing, article and category content.
5. Validate authoring constraints with marketing/content users.

**Tests:** section unit/component tests, Storybook a11y, visual snapshots at
agreed breakpoints, CMS empty states, long-copy stress and reduced motion.

### Phase 5 — Analytics and experimentation

**Consent/contract progress (2026-09-27):** The shared analytics package now
owns a runtime-validated product vocabulary for Landing page views, CTA clicks,
campaign views, experiment exposures and bounded content engagement. Landing
has an explicit build-time PostHog configuration boundary, lazy provider load,
the same conservative consent key as Product, delegated cross-app CTA capture,
bounded route templates, aggregate referrer classification and sanitized UTM
properties. Invalid or unknown properties fail closed and provider failures do
not affect navigation. Disabled builds retain the zero-JavaScript baseline.
Consent UI/legal copy and activation, an approved experiment brief/reporting
setup and a live A/A validation remain open; analytics must stay disabled until
the consent surface is approved.

**Experiment-foundation progress (2026-09-27):** Landing now owns a compiled,
versioned experiment registry with strict allocation/lifecycle/route policy,
deterministic consent-created assignment, a default-off global kill switch,
preview-only allowlisted overrides, one-time visibility exposure and bounded
CTA attribution. A/A definitions are required to map both buckets to the same
experience and are covered by a deterministic allocation sanity contract. The
registry remains empty: consent UI/legal approval, a real experiment brief,
PostHog reporting setup and a live A/A result are still activation gates.

**Consent-surface progress (2026-09-29):** Site Settings now owns an optional,
fully validated Legal-approved consent contract. Landing renders a calm,
non-modal Allow/Decline surface only when both that published contract and the
analytics build flag exist; missing or partial copy fails closed. The host-local
choice can be reopened from the footer, storage failures do not activate
tracking, and granting consent starts the lazy analytics/experiment runtime once
without a reload. No fallback legal copy is embedded in code. Legal approval,
privacy-route content, production PostHog activation, reporting and live A/A
evidence remain external gates.

**Analytics activation-gate progress (2026-09-29):** The scoped launch-readiness
command now joins the exact target analytics configuration to the validated
published snapshot. It requires analytics enabled, complete consent copy and an
exact privacy-link match to a published Generic Legal Page, while rejecting
experiment activation until its independent brief/reporting/A/A gates exist.
The default Campaign/Pricing gate remains uncoupled, output is limited to stable
codes and paths, and no PostHog key or Legal copy is emitted. Legal approval,
production activation, reporting and live A/A evidence remain external gates.

1. Define typed event and property schemas; extend the PostHog adapter without
   letting features call the SDK directly.
2. Implement the conservative consent baseline and explicit Astro public PostHog
   configuration validation.
3. Keep cross-domain attribution aggregate-only for the MVP; do not mint or
   exchange per-user tokens and keep Product auth cookies host-only.
4. Implement only deterministic, consent-gated CTA/island variants with
   reserved layout and one-time visible exposure semantics. Keep primary SEO
   content on the control; do not add CDN/full-page assignment in the MVP.
5. Implement experiment registry, kill switch, preview override restricted to
   staff/preview mode and expiry enforcement.
6. Launch an A/A test before the first A/B test to validate allocation and event
   joins.

**Tests:** deterministic island allocation, consent denied/granted, no PII
property acceptance, no duplicate exposures, control behavior without consent,
reserved-layout CLS and analytics-provider failure. Verify aggregate reporting
does not join campaign activity to individual signup identities.

### Phase 6 — Domain migration and rollout

**Offline rollout-readiness progress (2026-09-28):** The public Build Output
artifact now emits a continuing, tested security-header route before Campaign
and filesystem routing. CSP is derived from validated feature origins, denies
public framing and adds PostHog only when analytics is enabled. Preview applies
the same baseline while allowing only the configured Studio origin to frame it
and preserving private/no-store/noindex behavior. A bounded rollout checker
compares deployed status, canonical, robots, sitemap and headers with the exact
local candidate without logging bodies or raw headers. The parameterized domain
matrix, activation sequence and rollback runbook are documented. DNS/TLS,
custom-domain aliases, Better Auth/OAuth origin changes, live crawl evidence and
traffic cutover remain external gates.

1. Deploy Landing and editorial preview to approved non-production domains; keep
   all non-production surfaces excluded from indexing.
2. Crawl the rendered preview and compare URL/status/canonical/sitemap maps.
3. Configure `example.com`, `members.example.com`, `admin.example.com` and
   `studio.example.com`, plus TLS, security headers, CSP and allowed
   frame/image/connect origins.
4. Update Better Auth base/trusted origins, OAuth/email callback URLs if present,
   cross-domain navigation and cookie policy. Keep Product auth cookies
   host-only.
5. Apply explicit permanent redirects for moved marketing URLs. Keep login and
   registration redirects intentional and tested.
6. Run smoke, a11y, visual, performance and synthetic monitoring checks; then
   cut traffic gradually with a documented rollback switch.
7. Submit sitemap/Search Console configuration and watch crawl, CWV, conversion,
   error and CMS webhook metrics.

**Rollback:** restore previous domain routing; keep old Web root available for
one release window; do not delete old routes until crawl and conversion metrics
are stable.

### Phase 7 — Operational hardening

**Offline audit progress (2026-09-29):** Item 1 is implemented as a daily and
manually dispatched, read-only audit over the validated published-content and
experiment contracts. It checks internal destinations, Campaign expiry/archive
maintenance and experiment expiry/cleanup with stable, sanitized findings. The
workflow defaults to fixtures and can opt into a public Sanity dataset without
a read token. Live crawling remains part of Phase 6; editor publish SLOs,
webhook alerts and the monthly operating cadence below remain open.

**Service-level policy progress (2026-09-29):** Item 2 now has a tested,
provider-neutral policy for preview availability, publish-webhook availability
and publish-to-ready latency. It requires minimum samples, excludes expected
editor/delivery outcomes, groups actionable failures across consecutive windows
and fails fast on configuration incidents. Provider adapters, durable
observations, staging baselines and paging activation remain explicit gates, so
no production SLO compliance is claimed yet.

**Observation-adapter progress (2026-09-29):** Preview-enable and
publish-webhook boundaries emit sanitized best-effort observations into the
service logger, with environment/release context and no content or credential
fields. Preview now propagates request IDs and reports classified actionable
failures once. A secure Vercel deployment-completion signal, durable aggregation
and provider alert activation remain open.

1. Add scheduled broken-link, stale campaign and experiment-expiry reports.
2. Add editor preview/publish SLOs and webhook failure alerts.
3. Review search queries, content performance and CWV monthly.
4. Revisit CMS/vendor costs and content model complexity after real usage.

### Rough progress snapshot — 2026-09-29

These percentages are planning estimates, not release-readiness claims. They
measure the full Phase 0–7 plan with each phase weighted equally; external
Brand, Content, Security and infrastructure gates remain incomplete work.

| Phase              | Rough completion | Evidence now available                                                                        | Material remaining                                                                |
| ------------------ | ---------------: | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| 0 — Spikes         |              75% | Local A–F evidence; campaign Build Output routing; Astro/design-system and budget checks      | Protected preview handshake, live 308/410, deploy timing, Lighthouse/a11y and CWV |
| 1 — Workspace      |              88% | Astro app, Turbo/CI tasks, env validation, boundaries, E2E orchestration                      | Landing observability/runtime decision and production-owned assets                |
| 2 — SEO shell      |              94% | Metadata, JSON-LD, robots, sitemap, 404/410 routing, budgets and indexing build gate          | Live 308/410 evidence and approved brand/social assets                            |
| 3 — CMS foundation |              96% | Article/Category/Campaign/Pricing/Page contracts, parity, drafts, Visual Editing and webhooks | Protected handshake, webhook delivery evidence and Zod adoption decision          |
| 4 — MVP pages      |              82% | MVP plus Legal templates, hardened authoring, Presentation and content launch gate            | Approved content/assets, route activation and Content usability validation        |
| 5 — Analytics/A-B  |              83% | Typed events, consent UI, lazy adapter, registry, kill switch and activation readiness gate   | Approved privacy document, experiment brief/reporting and live A/A result         |
| 6 — Rollout        |              35% | Vercel apps, env destinations, security headers, verifier and rollback runbook                | Live evidence, custom domains, auth callbacks, crawl maps and gradual cutover     |
| 7 — Operations     |              55% | Scheduled audit, SLO policy and sanitized preview/webhook observation adapters                | Publish-ready signal, aggregation, baselines, paging and monthly cadence          |

**Overall rough completion: about 77%.** The Landing foundation alone is further
ahead (roughly 95%); the overall number is lower because CMS
integration, campaign/pricing, analytics, production rollout and operations are
part of the approved plan rather than optional polish.

## 10. Acceptance criteria

- `apps/landing` builds and deploys without database or auth secrets.
- Phase 0 spike report records reproducible evidence and every mandatory gate has
  passed or has an explicitly approved fallback.
- Published public pages render meaningful HTML with JavaScript disabled.
- Content editors can create, preview, review, publish and roll back an approved
  page without a code deployment.
- Publishing triggers an authenticated, atomic static deployment and becomes
  visible within the agreed 2-5 minute initial SLA; a failed build leaves the
  previous deployment available.
- Draft/preview content is authenticated, uncached and excluded from indexing.
- Sitemap, robots, canonical, metadata, social image and JSON-LD contracts pass
  automated tests for every indexable page type.
- MVP CTA/island assignment is stable after consent, exposure is not
  double-counted, and SEO primary content/metadata always match the control.
- MVP conversion reporting is aggregate-only; no Landing identity or campaign
  is joined to an individual Product signup.
- Landing meets agreed p75 CWV thresholds and accessibility checks on target
  devices.
- Product login/register/onboarding flows remain functional after domain split.
- Analytics is consent-aware, sanitized and never blocks conversion.
- CMS/PostHog outages degrade safely and are observable; an already deployed
  static site continues to serve during a CMS outage.

## 11. Verification commands (target state)

```bash
pnpm --filter @mini-workout/landing lint
pnpm --filter @mini-workout/landing check-types
pnpm --filter @mini-workout/landing test
pnpm --filter @mini-workout/landing build
pnpm --filter @mini-workout/storybook build
pnpm --filter @mini-workout/e2e test
pnpm --filter @mini-workout/e2e test:e2e --project=landing --project=landing-mobile
pnpm exec turbo boundaries
pnpm exec turbo run build lint check-types test --affected
```

Add Lighthouse/performance and link/crawl commands only after the team selects
the CI tool; do not hide vendor-specific commands behind root task logic.

## 12. Principal concerns and mitigations

| Concern                                      | Impact                                           | Mitigation / decision gate                                                                                                 |
| -------------------------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| Domain split changes auth and attribution    | Broken login/callbacks or privacy-invasive joins | Explicit URL/cookie/callback inventory; E2E auth journeys; MVP keeps auth cookies host-only and attribution aggregate-only |
| Astro adds a second framework                | More tooling and cognitive load                  | Spike A/B, narrow app boundary, local architecture docs, no framework leakage into shared packages                         |
| Astro/Sanity preview is more custom          | Editor friction or draft leakage                 | Mandatory Spike A; SSR only for preview; signed secret; production bundle inspection; Next.js fallback                     |
| Full static rebuild becomes too slow         | Missed publishing SLA                            | Spike C at projected scale; webhook coalescing; measured threshold for selective on-demand rendering                       |
| CMS becomes an unbounded page builder        | Design drift, regressions, slow pages            | Constrained typed sections, variants, schema validation, content governance                                                |
| Per-request experiments destroy cacheability | Higher TTFB/cost and weaker resilience           | MVP is CTA/island-only; no per-request SSR or CDN rewrite; re-open a spike before material page variants                   |
| Client-side flags cause flicker/CLS          | Poor UX and unreliable exposure                  | Control by default; consent-gated island variant in equivalent reserved layout; measure visibility before exposure         |
| Experiment content harms SEO                 | Duplicate/cloaked pages and unstable snippets    | Same bot/user policy, canonical control, 302 for temporary redirect tests, finite duration                                 |
| Preview token or draft leakage               | Confidential content exposure                    | Server-only least-privilege token, signed preview endpoint, `noindex`, redacted logs, token rotation                       |
| CMS outage blocks publication                | Stale content, not site downtime                 | Static deployed output, failed-build isolation, publish alert and rollback runbook                                         |
| Third-party scripts hurt CWV/privacy         | Search/conversion loss and compliance risk       | Consent gate, lazy load, CSP, script inventory and performance budget                                                      |
| Sharing UI couples brand releases            | Cross-app regressions                            | Share primitives/tokens only; keep page sections app-owned; Storybook and affected builds                                  |
| Two public apps confuse ownership            | Duplicate routes/canonicals                      | One canonical domain owner per path, routing manifest and redirect test suite                                              |
| Editorial schema changes break old pages     | Runtime failures                                 | Versioned section contracts, migration scripts, exhaustive registry, safe unknown handling                                 |
| Measurement is statistically invalid         | Wrong product decisions                          | A/A test, experiment brief, one primary metric, stopping rule, guardrail metrics, cleanup owner                            |

## 13. Confirmed decisions and remaining organizational gates

Confirmed:

- Domains: `example.com`, `members.example.com`, `admin.example.com` and
  `studio.example.com`.
- MVP routes: home, campaign, pricing, article and category SEO pages.
- Landing framework: Astro, subject to the mandatory technical spike gates.
- CMS: Sanity with separately deployed Studio.
- Analytics/experimentation: PostHog behind app-owned adapters and consent.
- Deployment default: Vercel, static production plus SSR editorial preview.
- Localization: one primary root locale initially; schemas are locale-ready but
  no speculative locale paths or `hreflang`.
- MVP experimentation: consent-gated CTA/island variants only; SEO primary
  content and metadata remain unchanged. Full-page/CDN experiments are deferred.
- MVP attribution: aggregate Landing and Product counts only; no user-level
  cross-subdomain join and no shared auth cookie.
- Editorial roles: Author, Reviewer/Editor, Publisher and restricted Admin.
- Experiment roles: Growth proposes, Product/Analytics approves methodology,
  Publisher activates, Engineering approves new technical capabilities.

Before production rollout, organizational owners still approve:

1. Sanity and PostHog procurement, region/data-residency and retention settings.
2. Applicable consent jurisdictions, legal copy and deletion/subject-request
   process.
3. Primary aggregate conversion definition and reporting retention window.
4. Named publishers, incident contacts and emergency rollback SLA.
5. Twelve-month page-volume forecast used by Spike C.
6. Whether publication scheduling must be accurate to the minute; if so, the
   static webhook/deploy latency may require a selective runtime route.

## 14. Reference rationale

- Astro defaults to prerendered static HTML and supports opt-in on-demand routes
  through official Vercel, Cloudflare, Netlify and Node adapters.
- Astro framework components render without client JavaScript unless an explicit
  `client:*` hydration directive is used.
- Sanity provides an official Astro integration and documented Presentation,
  draft perspective and Visual Editing workflow, but preview needs SSR and more
  application-owned integration than Next.js; Spike A validates that trade-off.
- Google recommends avoiding cloaking, canonicalizing alternate experiment URLs,
  using temporary redirects for redirect tests and ending experiments promptly.
