# Landing Content Launch Readiness Gate

**Status:** In progress
**Date:** 2026-09-29
**Owner:** `apps/landing`

## Goal

Give Marketing, Content and release owners one deterministic offline command to
prove that requested Campaign/Pricing surfaces are eligible for public launch
before enabling routes, navigation or indexing.

## Scope

- pure readiness policy over the validated published-content snapshot;
- independently selectable `campaign` and `pricing` launch surfaces;
- injected clock for Campaign lifecycle and expiry-window checks;
- stable severity/code/path output without copy, URLs or provider errors;
- fixture-safe CLI with opt-in public Sanity published source;
- runbook, tests and Plan progress update.

Excluded:

- approving offers, prices, legal copy, Campaign dates or assets;
- mutating/publishing Sanity content or activating `/pricing/`;
- live crawling, protected-preview or Vercel verification;
- replacing the broader operational broken-link/experiment audit.

## Policy

1. Requested Campaign launch requires at least one currently active validated
   Campaign. Scheduled, archived, redirected or gone Campaigns do not satisfy
   launch eligibility.
2. An active Campaign ending within seven days produces a warning, not a false
   pass without visibility.
3. Requested Pricing launch requires the validated Pricing singleton. Its
   existing contract already proves money, locale, plans, CTA, FAQ and mandatory
   cancellation/refund copy.
4. A release owner may require either surface independently; the default CLI
   requires both.
5. Repository/config/provider failures collapse to one stable boundary code.

## Acceptance criteria

1. Empty fixtures fail both default requirements with stable codes.
2. An active Campaign and valid Pricing singleton pass.
3. Scheduled/expired Campaigns cannot satisfy Campaign readiness.
4. Expiry-soon warning is deterministic from the injected clock.
5. Scope selection does not require unrelated surfaces.
6. CLI errors fail, warnings exit successfully, and output contains no content
   or provider details.
