# Landing consent surface execution plan

## Scope

Complete the next offline Phase 5 slice from the landing-platform master plan:
give visitors an explicit analytics choice using Legal-approved CMS copy, keep
analytics disabled before consent, and allow the choice to be revisited.

Out of scope: enabling production analytics, creating a real experiment,
PostHog dashboards, live A/A verification, consent-policy legal review, and
cross-domain identity joins.

## Decisions

- `siteSettings.analyticsConsent` owns the optional approved copy. Absence is
  the activation gate: Landing renders no consent surface and analytics cannot
  gain consent through this UI.
- The published Site Shell mapper validates the full nested contract. Invalid
  partial copy fails the content build instead of silently inventing legal text.
- The preference remains host-local under the existing
  `mini-workout:analytics-consent` key with only `granted` or `denied` values.
- The surface is a non-modal privacy note with equal access to Allow and
  Decline. A footer control reopens it after either choice.
- Granting consent dispatches a bounded browser event so the lazy analytics and
  experiment runtimes can start without a reload. They remain single-start and
  fail closed if the provider is unavailable.

## Files and responsibilities

- `apps/landing/src/content/published-site-shell.ts` and Site Shell catalog:
  validate and expose optional consent copy.
- `apps/landing/src/content/sanity/queries.ts`: project the nested copy.
- `apps/studio/schemaTypes/index.ts`: authoring fields and validation.
- `apps/landing/src/analytics/consent-preference.ts`: storage/event primitives.
- `apps/landing/src/components/AnalyticsConsent.astro`: accessible UI and
  interaction wiring.
- `apps/landing/src/layouts/SiteLayout.astro` and global styles: render the
  surface only when analytics config and approved copy are both present.
- `apps/landing/src/analytics/landing-entry.ts`: start analytics and experiments
  once after existing or newly granted consent.
- Focused tests plus the master plan: contract, activation and progress evidence.

## Acceptance criteria

1. Missing CMS consent copy produces no consent UI and does not invent copy.
2. Valid published copy renders Allow, Decline, privacy link and a persistent
   manage-preference control.
3. Analytics/PostHog is not loaded for missing, denied or undecided consent.
4. Allow persists `granted`, closes the note and starts the consent-gated
   runtime once without navigation or reload.
5. Decline persists `denied`, closes the note and does not start analytics.
6. The manage control reopens the note; keyboard focus and reduced-motion
   behavior remain usable.
7. Sanity preview/published queries and Studio schema match the validated
   Landing contract.

## Test strategy and verification

- RED/GREEN unit tests for consent storage/event primitives and Site Shell
  mapping, including absent, complete and partial copy.
- Studio schema contract test for authoring ownership.
- Landing analytics test for delayed one-time activation.
- Focused Landing and Studio tests first, then format, lint, type checks,
  coverage, builds, docs check and Turbo boundaries.
- No live deployment or PostHog activation is required for this offline slice.

## Risks and rollback

- Legal wording is content, never a source-code fallback. Roll back activation
  by removing the nested CMS value or disabling `LANDING_ANALYTICS_ENABLED`.
- A browser that blocks local storage remains unconsented and analytics stays
  off. The surface remains visible so the failure is privacy-safe.
- Existing stored `granted` consent is honored only when both build-time
  analytics configuration and approved CMS copy are active.
