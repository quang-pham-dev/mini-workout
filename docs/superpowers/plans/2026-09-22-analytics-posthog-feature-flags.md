# Analytics Abstraction and PostHog-Backed Feature Flags

**Status:** Phase A-C implemented; Phase D integration tests complete, rollout pending
**Date:** 2026-09-22
**Owner:** Platform / Web / Admin
**Decision class:** Cross-app analytics, feature flags, auth rollout safety

### Implementation progress

- Phase A contracts are implemented: `@mini-workout/analytics` now exposes
  provider-neutral browser/server contracts, no-op behavior, PostHog adapters,
  redaction, and deterministic tests.
- Web/Admin error-capture adapters now delegate to the shared browser adapter.
- `@mini-workout/observability` can delegate server capture to the shared
  `posthog-node` adapter while preserving its injected HTTP test seam.
- `@mini-workout/feature-flags` now has a typed registry, ownership/review
  metadata, deterministic local provider, and safe reader fallback.
- Web Better Auth now evaluates verification per request through a shared
  policy and PostHog/local reader. The hook replaces the request-scoped options
  object and never mutates the Web or Admin singleton.
- Flag-off/flag-on Better Auth integration tests prove auto-login compatibility,
  no session before verification, one verification email, unverified sign-in
  rejection, deterministic pseudonymous rollout identity, and no-op resend
  while disabled.
- PostHog decisions use a 45-second bounded process-local cache. Production
  defaults to PostHog; local/test defaults to the local provider. Provider
  outage or missing mail configuration resolves verification to `false`.
- Database-backed cross-instance auth limiting and Server Action coverage are
  implemented. Staging E2E with fake mail capture and percentage rollout
  remain pending.

## 1. Goal and scope

Extend the current PostHog error-capture adapters into a reusable
`@mini-workout/analytics` package and make `@mini-workout/feature-flags`
provider-driven. PostHog should be the first provider for analytics and remote
feature flags, while application/domain code depends only on stable contracts.

In scope:

- shared analytics contracts for capture, exception reporting, identity, reset,
  and shutdown/flush;
- shared feature-flag contracts and typed flag registry;
- PostHog browser and server adapters behind those contracts;
- server-side PostHog flag evaluation with deterministic fallback behavior;
- migration of Web/Admin error capture and auth verification flag consumers;
- tests, privacy allowlists, rollout documentation, and CI-safe local provider.

Out of scope:

- changing the product event taxonomy beyond the current error events;
- introducing a second analytics vendor now;
- enabling email verification in production;
- experiments or multivariate payloads until boolean release flags are stable.

### Approved decisions

- PostHog is the production source of truth for remote feature flags.
- If PostHog is unavailable, `auth.emailVerification` falls back to `false`.
- Use the official `posthog-node` SDK for server-side evaluation and capture.
- Cache release-flag decisions for 30–60 seconds; do not use the Next.js Data
  Cache unless explicit tags/invalidation are added.
- Roll out email verification through staging, then `1% → 10% → 50% → 100%`.

## 2. Discovery and constraints

### Current state

- `apps/web` and `apps/admin` each contain a near-duplicate PostHog client
  adapter.
- `packages/observability` owns server error classification/reporting and has a
  PostHog HTTP reporter.
- `packages/feature-flags` currently parses process environment values and is
  imported by `packages/auth` and Web actions.
- Better Auth Web/Admin instances are separate singletons because cookie
  plugins differ.
- `baseAuthOptions` is currently constructed at module scope; a remote PostHog
  decision must not be read once and silently become stale.

### Required invariants

- Feature/domain code must not import `posthog-js`, `posthog-node`, or call the
  PostHog REST API directly.
- Analytics and flag-provider failures are best-effort for telemetry and use a
  documented safe fallback for product behavior.
- No emails, tokens, cookies, authorization headers, raw URLs/query strings,
  request bodies, passwords, or provider response bodies enter analytics.
- Auth verification must fail closed from a configuration perspective, but a
  temporary flag-provider outage must not make all existing sign-ins fail.
- Browser flags must not flicker: evaluate on the server where needed and
  bootstrap/pass the result to the client.
- The E2E/local provider must be deterministic and must not call PostHog.

## 3. Provider-neutral architecture

### 3.1 `@mini-workout/analytics`

Create a framework-agnostic package with contracts such as:

```ts
type AnalyticsEventProperties = Readonly<Record<string, unknown>>;

interface AnalyticsClient {
  capture(event: string, properties?: AnalyticsEventProperties): void;
  captureException(error: unknown, properties?: AnalyticsEventProperties): void;
  identify(distinctId: string): void;
  reset(): void;
  shutdown?(): Promise<void>;
}

interface FeatureFlagProvider {
  isEnabled(key: string, context: FlagEvaluationContext): Promise<boolean>;
  getVariant?(
    key: string,
    context: FlagEvaluationContext,
  ): Promise<string | null>;
}
```

The package should also own:

- allowlisted event/error property serialization;
- stable event names and internal analytics context types;
- a no-op client/provider;
- provider factory selection (`posthog` or `noop/local`), without leaking SDK
  types to consumers.

`@mini-workout/observability` should consume the `AnalyticsClient`/error
reporter contract rather than know how a vendor is initialized. Its current
classification, deduplication, and redaction rules remain authoritative.

### 3.2 `@mini-workout/feature-flags`

Keep this package free of PostHog and framework dependencies. Replace the
current environment-only implementation with:

- a typed registry (`auth.emailVerification`, future release flags);
- `FeatureFlagReader`/`FeatureFlagProvider` contracts;
- `isFeatureEnabled(reader, key, context)` and safe fallback policy;
- a local provider for tests/CI and an environment provider for explicit local
  overrides;
- metadata for owner, purpose, type, default, and removal/expiry review.

The package must not expose raw PostHog flag names to feature code. Map stable
product keys to provider keys in one adapter/registry module.

### 3.3 PostHog adapters

Implement in `@mini-workout/analytics`:

- browser adapter around `posthog-js` with consent, identity reset, and
  allowlisted capture;
- server adapter around the official PostHog Node SDK (or a narrow HTTP
  adapter if dependency size requires it);
- PostHog feature-flag provider using server-side evaluation for authenticated
  flows and browser bootstrap for client rendering;
- flush/shutdown behavior for short-lived server functions;
- bounded timeout, swallow-on-telemetry-failure, and safe fallback behavior.

The server adapter must use the internal user ID as `distinct_id` only after
the session is verified. Anonymous contexts use a stable per-user/session ID,
not a shared literal. Do not use email as identity.

## 4. Auth verification integration design

This is the highest-risk part and needs a feasibility spike before the main
implementation.

1. Confirm Better Auth 1.7.1 supports request-aware hooks or an equivalent
   boundary for checking the current flag without rebuilding the singleton.
2. If supported, keep `baseAuthOptions` provider-neutral and perform the flag
   decision in the request hook/action boundary. Verification gating and
   resend behavior must use one evaluated snapshot per request.
3. If not supported, do not force a dynamic remote decision into module-scope
   options. Use a dedicated auth policy service around Better Auth that:
   - evaluates the flag with a short TTL cache;
   - explicitly handles sign-up, sign-in, verification, and reset flows;
   - revokes any transient session before returning an unverified response;
   - preserves the existing flag-off behavior.
4. Keep the local environment provider as an explicit CI/test override. It
   must never silently override a production PostHog decision.
5. Default provider failure to the previously working safe behavior, emit one
   sanitized diagnostic, and expose a health/rollout signal. Do not block all
   authentication on PostHog availability.

The current `MW_FEATURE_AUTH_EMAIL_VERIFICATION` flag remains default-off until
this spike and integration tests prove both states.

## 5. Migration sequence

### Phase A — Contracts and compatibility

- Add `@mini-workout/analytics` package, no-op provider, typed contracts, and
  privacy tests.
- Move duplicated Web/Admin sanitization and PostHog adapter behavior behind
  the shared contracts without changing runtime behavior.
- Keep existing environment variables as compatibility aliases while adding a
  documented canonical naming scheme.

### Phase B — PostHog providers

- Add browser and server PostHog adapters.
- Add server flag evaluation with timeout, short TTL cache, and safe fallback.
- Add client bootstrap path for flags needed during initial render.
- Add identity/linking rules and optional PostHog tracing headers only for
  allowlisted first-party hostnames.

### Phase C — Feature-flag package migration

- Replace direct environment parsing in Web/Auth with injected flag readers.
- Keep a local provider for unit tests and E2E; no network dependency in CI.
- Add typed registry metadata and stale-flag ownership/removal checklist.

### Phase D — Auth verification rollout

- Complete the Better Auth feasibility spike.
- Add flag-off/flag-on integration tests, fake email transport, resend and
  password-reset journeys, rate-limit behavior, and session revocation checks.
- Enable PostHog flag only in local/staging first, then percentage rollout.
- Keep kill-switch and rollback instructions documented.

### Phase E — Documentation and cleanup

- Update auth plan, environment examples, CI documentation, observability
  dashboard/runbook docs, and package READMEs.
- Remove duplicated app adapters only after Web/Admin parity tests pass.
- Define a review date and owner for every release flag; remove the local flag
  after the rollout is stable.

## 6. Testing strategy

### Unit

- allowlist and redaction: secrets, PII, URLs, query strings, tokens;
- no-op and PostHog adapters: disabled/missing key, consent, identity/reset;
- provider timeout/failure never changes product response;
- flag mapping, variants, malformed provider values, null/unavailable result;
- local provider and deterministic fallback;
- no duplicate error capture.

### Integration

- server PostHog flag evaluation uses verified internal IDs;
- cache TTL and invalidation behavior;
- Better Auth flag-off/flag-on policy with singleton isolation;
- verification provider configuration fail-fast;
- auth provider outage preserves the documented fallback behavior.

### E2E

- CI uses local provider and fake email capture only;
- Web and Admin error capture remain non-blocking;
- verification flag off preserves current registration/sign-in;
- verification flag on covers sign-up → email → verify → onboarding;
- reset password and session invalidation;
- no browser payload contains email/token/password/query string.

## 7. Verification commands

```bash
pnpm install --frozen-lockfile
pnpm --filter @mini-workout/analytics lint
pnpm --filter @mini-workout/analytics check-types
pnpm --filter @mini-workout/analytics test
pnpm --filter @mini-workout/feature-flags lint
pnpm --filter @mini-workout/feature-flags check-types
pnpm --filter @mini-workout/feature-flags test
pnpm --filter @mini-workout/observability test
pnpm --filter web lint
pnpm --filter web check-types
pnpm --filter web test
pnpm --filter admin lint
pnpm --filter admin check-types
pnpm --filter admin test
pnpm test:e2e
pnpm test:e2e:admin
pnpm build
```

## 8. Risks and rollback

| Risk                                    | Mitigation                                                 | Rollback                                              |
| --------------------------------------- | ---------------------------------------------------------- | ----------------------------------------------------- |
| PostHog outage/latency blocks auth      | timeout, TTL cache, local fallback, one diagnostic         | switch provider to local/default-off                  |
| stale flag enables old behavior         | owner/expiry metadata and startup/health visibility        | disable flag in PostHog, then remove code             |
| server/client flag mismatch             | server evaluation + bootstrap, one request snapshot        | disable client rollout and use server fallback        |
| duplicate analytics/error events        | one shared adapter and boundary ownership tests            | disable capture while preserving app errors           |
| user identity leakage                   | internal IDs only, allowlist tests, no raw form/query data | disable provider and rotate exposed credentials       |
| Better Auth singleton cannot be dynamic | feasibility spike before refactor                          | retain local static flag until policy boundary exists |

## 9. Open decisions for review

1. **Provider precedence:** approved — PostHog is the production source of
   truth; local provider is for CI/E2E and no environment override is used in
   production.
2. **Fallback when PostHog is unavailable:** approved — email verification is
   `false`, with a sanitized diagnostic and health signal.
3. **Server SDK:** approved — use `posthog-node` for server flag evaluation and
   capture.
4. **Flag identity:** approved — use internal user ID after verification and a
   stable anonymous/session ID before login; never email or a shared literal.
5. **Remote flag cache TTL:** approved — 30–60 seconds for release flags, with
   no Next.js Data Cache unless explicitly tagged/invalidation is designed.
6. **Auth rollout:** approved — staging first, then 1% → 10% → 50% → 100%, with
   a documented kill switch and success/error metrics at each stage.

## 10. PostHog guidance used

- Next.js integration recommends server-side evaluation and client bootstrapping
  to avoid flicker; server SDK calls in short-lived functions should flush and
  shut down explicitly: <https://posthog.com/docs/libraries/next-js>.
- PostHog recommends stable IDs, `identify` after login, and `reset` on logout;
  email should not be the primary identity: <https://posthog.com/docs/libraries/next-js>.
- PostHog's current guidance emphasizes local evaluation/caching, safe fallback
  when flags are unavailable, grouping flag logic behind a small boundary, and
  removing stale flags: <https://newsletter.posthog.com/p/dont-make-these-classic-feature-flag>.
