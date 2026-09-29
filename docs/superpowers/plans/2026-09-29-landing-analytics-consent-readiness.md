# Landing analytics-consent readiness execution plan

## Scope

Add the final offline release gate between the implemented consent/legal
surfaces and analytics activation. The command must prove that target analytics
configuration, published consent copy and its referenced Legal Page agree before
PostHog is enabled.

Out of scope: enabling production analytics, approving legal copy, creating an
experiment brief, configuring PostHog dashboards, or performing live A/A
validation.

## Decisions

- Add an explicit `analytics-consent` launch surface. Keep the existing default
  Campaign/Pricing gate unchanged so independent releases do not become coupled.
- Parse target environment through the existing Landing environment contract;
  never inspect or print the PostHog key.
- Require analytics to be enabled in the target configuration, complete
  published consent copy, and a published Generic Legal Page whose canonical
  path exactly matches the consent privacy link.
- Fail when experiments are enabled. The compiled registry remains empty and no
  approved experiment brief exists, so analytics consent does not authorize A/B
  execution.
- Emit only stable `severity:code:path` output and preserve the existing generic
  repository/configuration failure boundary.

## Acceptance criteria

1. `--require=analytics-consent` is parsed deterministically and does not change
   the Campaign/Pricing default.
2. Disabled analytics, missing consent copy, unresolved privacy page and enabled
   experiments each produce stable error codes without content or secrets.
3. The scope passes only when analytics configuration is valid, experiments are
   off, consent copy exists and its link resolves to a published legal page.
4. Existing Campaign/Pricing behavior and output remain unchanged.
5. The runbook documents exact execution order and separates automated evidence
   from Legal, privacy and rollout approval.

## Verification

- RED/GREEN unit tests for surface parsing and every readiness state.
- Landing tests and coverage, lint, type check and production-static build.
- Artifact budget, documentation checks and Turbo boundaries.
- No live provider call, deploy or environment mutation.

## Rollback

Remove the new scope from release automation or keep
`LANDING_ANALYTICS_ENABLED=false`. Existing Campaign/Pricing readiness behavior
is intentionally unchanged.

## Completion evidence — 2026-09-29

- RED checkpoint: `a5dffdc`; focused GREEN contract includes the pnpm argument
  delimiter regression and all readiness states.
- Landing suite: 33 files and 232 tests passed; statement coverage remains above
  the repository threshold.
- Landing lint, Astro type-check and Astro ownership boundaries passed.
- Production-static fixture build emitted four pages with `0 B` gzip JavaScript;
  artifact budget and documentation checks passed.
- CLI negative smoke test emitted only
  `error:consent_copy_missing:siteShell.analyticsConsent` for an enabled fixture
  target without approved consent content. No provider call, deploy or
  environment mutation was performed.
