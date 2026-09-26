# Landing Published Content Contract — Execution Plan

**Status:** Complete — Article, Category and Site Shell published slices  
**Date:** 2026-09-24  
**Owner:** `apps/landing`

## Scope

Implement the offline portion of Phase 3 for the existing Mobility Article:

- accept CMS-shaped values as `unknown` at one app-owned boundary;
- map schema version 1 published Article documents into the existing static
  view model;
- render only registered, versioned Article sections;
- exclude drafts and fail the build for malformed published content;
- keep Sanity clients, preview routes, webhooks and Campaign/Pricing contracts
  disabled.

No new dependency, environment variable, route or database migration is part of
this slice. Runtime Zod schemas remain a later CMS-integration decision; this
slice establishes the same validation boundary without adding a dependency.

## Decisions

1. Raw content types and validation remain private to `apps/landing`; public DTOs
   are not introduced because there is no independent runtime consumer.
2. Section discriminants include their contract version (`prose.v1` and
   `pullQuote.v1`). Unknown versions are rejected instead of rendered as raw
   rich text.
3. Draft documents are ignored by the published collection mapper. Invalid
   published documents throw a sanitized `ContentContractError`, making static
   builds fail closed.
4. Paths and media sources are derived or restricted to local absolute paths;
   editors cannot supply arbitrary canonical paths or URL protocols.
5. The Article template renders the ordered section union through an exhaustive
   component. The mapper, not the template, owns input validation.

## Files and responsibilities

- `src/content/published-article.ts`: unknown-input validation, v1 mapping,
  collection policy and sanitized errors.
- `src/content/section-registry.ts`: registered section keys and exhaustive
  contract helpers.
- `src/features/articles/ArticleSection.astro`: exhaustive section renderer.
- `src/features/articles/catalog.ts`: local CMS-shaped fixtures passed through
  the production mapper.
- `tests/published-content.test.ts`: valid, draft, invalid, unsafe-path and
  unknown-section behavior.
- Existing Article tests/build/E2E: guard the route and rendered SEO output.

## Acceptance criteria

- The current Article is generated from a validated v1 document.
- A draft cannot enter the published route collection or sitemap.
- Unknown schema/section versions, malformed required fields, unsafe media
  paths and slug/canonical inconsistencies are rejected deterministically.
- Ordered prose and pull-quote sections render with no client JavaScript.
- Existing SEO, artifact-budget and browser gates remain green.

## Verification

1. Focused RED/GREEN mapper tests.
2. Landing formatting, lint, type-check and coverage (minimum 80%).
3. Landing production build, artifact budget and Playwright suite.
4. `pnpm exec turbo boundaries`, `pnpm docs:check` and `git diff --check`.

## Risks and rollback

- Hand-written validation can drift from the later Sanity schema. Keep it
  isolated and replace its internals with Zod at the CMS boundary if that
  dependency is approved; preserve the mapped view-model contract.
- Strict failure can block publishing, intentionally protecting production from
  malformed content. Roll back by reverting this slice; do not add permissive
  raw-content rendering.

## Result

The Mobility Article fixture now enters the same unknown-input mapper intended
for the future CMS query boundary. Versioned prose and pull-quote sections render
in source order through an exhaustive Astro component. Drafts are excluded;
malformed published documents fail the static build with sanitized issue codes.

Evidence recorded on 2026-09-24: 31 unit tests passed with 89.37% statements and
86.04% branches, Astro reported no diagnostics, 14 desktop/mobile Playwright
tests passed, and the production artifact retained 0 bytes gzip first-party
JavaScript. The Campaign contract and Sanity integration remain deliberately
out of scope pending approved campaign lifecycle inputs and CMS gates.

## Category and shared-primitives extension

The next offline slice applies the same fail-closed boundary to Category and
extracts app-owned validation primitives for normalized slugs, SEO, local media
and internal links. Both Article and Category must consume those primitives so
the future Sanity query mapper has one policy source. Mobility keeps its current
rendered output and gains a validated Home backlink. Sanity schemas, query
modules, preview and webhooks remain the following step, not part of this one.

### Extension result

The Mobility Category fixture now enters a schema-v1 unknown-input mapper before
static route generation. Article and Category share validation primitives for
normalized slugs, derived SEO canonicals, local media and internal links. The
Category Home backlink is content-shaped but protocol/path constrained. Drafts
remain excluded and invalid published Categories fail the build.

Evidence recorded on 2026-09-24: 53 unit tests passed with 89.93% statements and
84.78% branches, Astro reported no diagnostics, workspace boundaries passed,
14 desktop/mobile Playwright tests passed and the production artifact retained
0 bytes gzip first-party JavaScript.

## Sanity schema and query alignment

An isolated `apps/studio` now registers the schema-v1 Article, Category and
Author documents plus SEO, Sanity image, internal-link and versioned Article
section objects. Studio owns React 19.3.0 locally; Product/Admin dependency pins
are unchanged. Landing owns published-only GROQ projections and a server-side
content source that maps every response through the existing fail-closed
contracts. Provider failures use stable `CONFIG_INVALID` or
`DEPENDENCY_UNAVAILABLE` codes and do not expose provider messages.

This slice does not activate Sanity as the production build source. Local
fixtures remain authoritative until a real project/dataset is configured and
the published dataset is validated. Preview/drafts, Presentation, tokens,
webhooks and deployment triggers remain disabled under the existing Spike A/C
gates.

## Content-source activation readiness

Home, dynamic Article/Category paths and sitemap generation now read through a
single cached published-content repository. `fixtures` is the default source.
Selecting `sanity` requires the non-secret project ID and dataset at config
load; missing configuration fails before Astro builds. Once activated, provider
or mapping errors fail the build and do not fall back to fixtures. This prevents
an outage or invalid publish from silently deploying stale local content.

The real-dataset gate remains open. The configured public dataset is reachable
but does not yet contain the baseline content. Required evidence before
production activation: seed the approved Mobility Author/Category/Article,
compare mapped output and canonical inventory against fixtures, inspect Sanity
image projection, and complete one successful published-source build. No read
token is required for the public published dataset; preview remains a separate
protected boundary.

## Pre-activation parity gate

The repository now provides a deterministic comparison between the reviewed
fixture snapshot and a mapped Sanity published snapshot. It checks
Article/Category route inventory, canonical and SEO fields, Article-to-Category
relationships, ordered section identities and reserved image dimensions. The
result contains stable codes and slug-scoped paths only; copy, asset URLs,
provider messages and credentials are never emitted.

Run `pnpm check:landing-content-parity` with `SANITY_PROJECT_ID` and
`SANITY_DATASET` configured in the execution environment. Missing configuration,
CMS unavailability, invalid mapped content and drift all exit non-zero. The
checker intentionally performs no fixture fallback and does not require or
accept a preview token for the public published dataset.

This closes the parity tooling portion of the activation gate offline. The gate
itself remains open until infrastructure and approved content exist: import the
real Author/Category/Article and image assets, run this checker, inspect the
rendered Sanity image, then complete a Sanity-sourced static build. Once the
baseline migration is accepted, ordinary editorial change should use reviewed
publishing workflows rather than require permanent equality with fixtures.

Evidence recorded on 2026-09-24: the missing-configuration CLI case failed
closed with `CONFIG_INVALID`; 65 Landing unit/contract tests passed; the parity
comparator reached 100% statement and branch coverage; aggregate Landing
coverage reached 90.67% statements and 87% branches; Astro type-check, lint,
format, documentation checks and the fixture production build passed. The
artifact remained at 0 bytes gzip first-party JavaScript, 6,918 bytes gzip CSS
and 399,470 bytes total static output.

## Studio authoring acceleration slice

Scope the next Studio slice to the already validated Article, Category and
Author contracts. Add a task-oriented desk structure, editor previews and
shared pure validators that mirror Landing slug/internal-link policy. Normalize
Studio configuration on the same non-secret `SANITY_PROJECT_ID` and
`SANITY_DATASET` names used by Landing, while accepting the existing
`SANITY_STUDIO_*` names temporarily for compatibility. Environment files remain
app-local and values are never copied or logged by tooling.

Settings, Navigation, generic Page, Campaign and Pricing schemas stay out of
this slice. They require app-owned mapped contracts and query consumers first;
adding CMS fields ahead of those boundaries would reintroduce schema drift.
Preview/Presentation, document publishing controls and webhooks also remain
behind the existing security/infrastructure gates.

Acceptance criteria: Studio groups editorial documents clearly; previews expose
useful title/subtitle/media selections; slug and internal-link validation reject
the same unsafe shapes as Landing; schema/desk contracts have focused tests; and
Studio lint, type-check and production build remain green with offline defaults.

### Studio authoring result

Studio now groups Article/Category under Editorial and Author under People,
without introducing accidental singleton documents. Article, Category and
Author previews select useful identifying fields and editorial media. Shared
pure validators enforce Landing-compatible normalized slugs and safe internal
paths, including query, traversal, backslash and protocol rejection. Studio and
Landing now share `SANITY_PROJECT_ID` / `SANITY_DATASET` naming; legacy Studio
names remain a compatibility fallback. Each app still loads its own local env
file, so no environment value is copied across workspace boundaries.

Evidence recorded on 2026-09-24: 26 Studio tests passed and the validator module
reached 100% statement, branch and function coverage. Studio lint, formatting,
type-check and production build passed. A read-only parity run reached the
configured public dataset successfully and reported two expected inventory
gaps: the Mobility Category and its Article have not been published yet. This
narrows the real-dataset gate from infrastructure discovery to content/asset
authoring and publish validation.

The first configured Studio run exposed a Sanity-specific environment rule:
only `SANITY_STUDIO_*` variables are injected into the browser bundle. A small
workspace launcher now loads the app-local env and maps the shared non-secret
names into that required prefix for the Sanity child process. A production build
was verified to embed the configured project rather than use the offline
fallback; the launcher behavior is protected by package-script contract tests.

### Real-dataset activation result

The public production dataset now contains the baseline Author, Mobility
Category and Mobility Article plus their two uploaded image assets. The seed is
dry-run by default, creates only missing documents, does not overwrite editor
changes and requires an app-local `SANITY_AUTH_TOKEN` only for writes. The token
is never bundled or logged and should be revoked after bootstrap automation is
finished.

The first seed used dotted custom IDs, which Sanity correctly treated as private
subpaths even though the dataset itself was public. The migration created
replacement root IDs using hyphens, reused the existing assets, verified public
parity, and then deleted exactly the three legacy private documents. A guarded
cleanup command refuses deletion unless all replacement documents exist.

Final evidence on 2026-09-24: anonymous fixture-to-Sanity parity passed for one
Category and one Article, including route inventory, SEO/canonicals,
relationships, section order and image dimensions. A Sanity-sourced Astro build
generated Home, Mobility Category, Mobility Article and 404 plus robots/sitemap.
No read token or fixture fallback was used. This closes the real-dataset parity,
image projection and published-source build gate; preview, webhook and
operational publishing automation remain separate work.

## Site Shell singleton result

Site Settings and Primary Navigation now follow the same dependency-isolated
path as Article and Category: Landing owns the unknown-input contract and
fail-closed mapping, the Sanity source owns published-only GROQ, and Studio
mirrors the proven fields afterward. The shared repository snapshot supplies
brand, footer copy and internal navigation to `SiteLayout.astro`, removing those
values from template hardcoding.

Product sign-in and registration destinations deliberately remain
architecture-owned constants. Editors may change their labels but cannot move
users across the `example.com` / `app.example.com` trust boundary. Primary
editorial links reuse the validated internal-link contract and reject external,
query-bearing or traversal paths.

Studio exposes fixed-ID Site Settings and Primary Navigation editors under a
Configuration desk group and removes both types from the global create menu,
preventing accidental duplicate singletons. The idempotent baseline workflow
created only the two missing public documents; parity now also checks Site Shell
copy and ordered navigation identity without logging values.

Evidence recorded on 2026-09-24: 32 Studio tests and 72 Landing tests passed;
both apps type-checked; Studio and Sanity-sourced Landing production builds
passed; anonymous fixture-to-Sanity parity passed for the two singleton
documents plus one Category and one Article. Generic Page, Campaign and Pricing
contracts remain intentionally deferred until their Landing-owned consumers are
specified. Secure preview, webhook automation and publishing runbooks remain
the next Phase 3 infrastructure track.
