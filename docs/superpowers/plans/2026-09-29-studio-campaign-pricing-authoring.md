# Studio Campaign And Pricing Authoring Hardening

**Status:** In progress
**Date:** 2026-09-29
**Owner:** `apps/studio`

## Goal

Make Campaign and Pricing authoring fail early in Sanity Studio with the same
structural rules as Landing, and give Content/Marketing useful document cards
and Campaign Presentation navigation without inventing commercial content.

## Scope

- Campaign section order/count/key validation matching the Landing mapper;
- Pricing currency, locale and conditional billing field validation;
- deterministic Campaign and Pricing document previews;
- Campaign Presentation location for valid slugs;
- focused tests, Studio documentation and master-plan progress;
- removal of the accidental duplicate Category SEO field discovered during
  schema review.

Excluded:

- approved prices, legal copy, Campaign dates or production assets;
- public `/pricing/` activation or Pricing Presentation location;
- live Sanity dataset mutation or browser verification;
- new schema versions or content migrations.

## Decisions

1. Pure validators and preview preparers live in `apps/studio/schemaTypes`; they
   are independently testable and remain aligned with the Landing boundary.
2. A Campaign must start with exactly one hero, contain at most one final CTA,
   use allowed versioned section types and have unique section/nested item keys.
3. Pricing receives field-level feedback for ISO currency, locale and recurring
   interval semantics while retaining the whole-document invariant check.
4. Campaign Presentation points to `/campaigns/:slug/`. Pricing remains without
   a location until its route and commercial inputs are approved.

## Acceptance criteria

1. Invalid Campaign composition is rejected before publish.
2. Currency, locale and billing errors surface at their owning fields.
3. Campaign/Pricing cards expose lifecycle and schedule/plan context without
   depending on the current clock.
4. Valid Campaign slugs resolve to the protected Landing preview route; missing
   slugs remain cautioned.
5. Studio test, coverage, lint, type-check and build pass without new env vars or
   dataset writes.
