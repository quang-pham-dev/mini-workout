# Landing generic legal page execution plan

## Scope

Complete the remaining offline Generic Page contract in master-plan Phase 3 and
provide the Phase 4 Astro template needed for an approved `/privacy/` page.
The fixture inventory stays empty, so this change must not publish placeholder
legal text or add a public route before Content/Legal supplies a document.

Out of scope: drafting privacy policy language, deciding applicable
jurisdictions, publishing a live document, enabling analytics, or changing
consent retention/deletion policy.

## Decisions

- Sanity owns a `marketingPage` document with schema version and lifecycle.
- The initial template registry supports only `legal.v1`. It renders structured
  `legalSection.v1` blocks instead of arbitrary Portable Text.
- Generic pages use a root canonical path (`/{slug}/`) but reject existing app
  route namespaces and infrastructure paths at the mapper and Studio boundary.
- `effectiveDate` is required ISO calendar data. It communicates legal-document
  freshness and is not inferred from CMS metadata.
- Published pages join the shared repository, parity inventory, sitemap,
  static-path generation and protected Presentation preview.
- The fixture collection remains empty. `/privacy/` appears only after a valid
  published CMS document exists.

## Acceptance criteria

1. Valid schema-v1 `legal.v1` documents map to a canonical static view model.
2. Drafts produce no route; malformed, duplicated or reserved slugs fail closed.
3. Unknown templates/sections, empty paragraphs, duplicate section keys and
   invalid effective dates fail the content build.
4. Sanity published/preview queries and Studio schemas mirror the mapper.
5. Published generic pages participate in repository caching, parity, sitemap,
   static generation and Presentation preview.
6. The Astro template is semantic, keyboard-safe, responsive and free of client
   JavaScript. It contains no invented legal copy or decorative imagery.

## Test and verification strategy

- RED/GREEN mapper and catalog tests for lifecycle, route reservation and
  section exhaustion.
- Repository/query/parity and Studio schema/Presentation contract tests.
- Landing and Studio tests, coverage, lint, type checks and builds.
- Static artifact budget, documentation validation and Turbo boundaries.
- No live verification or CMS publish is required for this offline slice.

## Risks and rollback

- Root-level slug collisions are prevented by one shared reserved-slug policy.
- Legal text is not seeded. Removing/unpublishing the CMS document removes the
  route on the next successful static deployment.
- A future richer marketing template must add a new versioned template/section
  registry entry; it must not weaken `legal.v1` into arbitrary page-builder data.

## Completion evidence

Implemented offline on 2026-09-29. The RED checkpoint captured the missing
mapper, fixture catalog, Studio schema and Presentation contract. GREEN
verification covers 226 Landing tests at 87.24% statements / 83.15% branches,
57 Studio tests, Landing and Studio lint/type checks and builds, the production
static artifact budget, documentation checks and Turbo boundaries. The static
fixture build still contains only four existing pages, proving that this slice
did not publish `/privacy/` or placeholder legal text. Approved CMS content and
Legal sign-off remain activation inputs.
