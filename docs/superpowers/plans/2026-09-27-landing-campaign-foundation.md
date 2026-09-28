# Landing Campaign Foundation — Execution Plan

**Status:** Complete — offline contract, no public campaign
**Date:** 2026-09-27
**Owner:** `apps/landing` and `apps/studio`

## Scope

Close the offline Campaign portion of Phase 3 without inventing or publishing a
marketing offer. Landing owns a schema-v1 unknown-input mapper, a constrained
section union, explicit schedule/expiry policy and lifecycle classification.
Sanity mirrors that proven contract and the shared content repository can load
zero or more campaigns from fixtures or Sanity.

Out of scope: an indexable campaign fixture, campaign UI/route, home promotion,
redirect/410 platform rules, approved offer copy, imagery, legal terms and
production scheduling guarantees. Those require a real campaign and Content /
Marketing approval.

## Decisions

1. Every campaign requires UTC `startsAt` and `endsAt`; `startsAt < endsAt`.
2. Every campaign requires one explicit expiry mode: `gone`, `redirect` or
   `archive`. Redirect requires a safe internal successor; other modes reject a
   successor so stale policy cannot be silently retained.
3. Lifecycle (`scheduled`, `active`, `expired`) is derived from an injected
   clock. The CMS cannot manually claim that a campaign is active.
4. Campaign composition is limited to versioned hero, benefits, FAQ and CTA
   sections. Unknown section versions fail the build.
5. No fixture means no campaign route, sitemap entry or Home promotion. The
   contract is production-shaped but deliberately produces no public content.

## Files and responsibilities

- `apps/landing/src/content/published-campaign.ts`: validation and collection
  policy.
- `apps/landing/src/content/campaign-section-registry.ts`: exhaustive section
  contract and lifecycle types.
- `apps/landing/src/features/campaigns/catalog.ts`: empty reviewed fixture
  collection and view-model ownership.
- Landing repository/Sanity query source: campaign loading through the same
  fail-closed boundary as Article and Category.
- `apps/studio/schemaTypes/index.ts`: matching authoring contract only after the
  Landing tests define it.

## Acceptance criteria

- Valid campaign documents map without raw CMS values reaching UI consumers.
- Drafts are excluded; malformed published campaigns fail closed with stable
  issue codes.
- Invalid/reversed dates, implicit expiry, unsafe redirect targets, duplicate
  slugs/IDs/section keys and unknown section versions are rejected.
- Boundary-time lifecycle classification is deterministic.
- Fixtures and Sanity both expose `campaigns` in the repository snapshot, while
  the current public route inventory remains unchanged and empty for campaigns.
- Studio schema and GROQ projections stay aligned with the Landing contract.

## Verification

Use RED/GREEN focused tests, then Landing and Studio format/lint/type/test,
coverage, static build/budget, workspace boundaries, documentation checks and
`git diff --check`.

## Risks and rollback

Static deployments cannot change status at the exact expiry instant without a
new deployment. The later route slice must translate `gone`, `redirect` and
`archive` into verified Vercel behavior and measure webhook/scheduled rebuild
latency. Until then, no campaign is published. Rollback is removal of this
contract/schema slice; there is no migration or public URL to unwind.

## Result

Landing now validates Campaign documents and their versioned hero, benefits,
FAQ and conversion-CTA sections before they enter the shared repository.
Conversion CTAs expose only `login` / `register` intent; editors cannot replace
the environment-owned Members origin. Sanity Studio mirrors the schedule,
expiry and section constraints and lists Campaign under Editorial. Published
and preview GROQ pass through the same mapper. The empty fixture collection was
retained, and the static build still emits only Home, Mobility, Article and 404.

Evidence on 2026-09-27: Landing 127 tests passed with 87.62% statement and
81.31% branch coverage; Studio 47 tests passed with 100% statement and 91.17%
branch coverage for its measured validator module. Both workspaces passed
format, lint and type checks; Landing and Studio production builds passed;
Landing remained at 0 B gzip JavaScript and within its artifact budget. Turbo
boundaries, documentation checks and `git diff --check` passed.
