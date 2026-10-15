# Auth Recovery, Email Verification, and Rate Limiting

**Status:** Recovery, verification E2E, and shared rate limiting implemented; provider-backed verification rollout pending
**Date:** 2026-09-22
**Owner:** Auth platform / Web
**Decision class:** Cross-app authentication, feature rollout, email delivery,
and abuse prevention

## 1. Goal

Complete roadmap step 6 without changing the current sign-in experience for
existing environments until the email-verification rollout is explicitly
enabled:

- password recovery with safe, generic UX;
- email verification with a reversible feature flag;
- verification-aware registration and sign-in behavior;
- production-safe Better Auth rate limiting;
- shared primitives that can be consumed by both `apps/web` and `apps/admin`.

Implementation must not enable verification in production until the
provider-backed flag and analytics decisions in
[`2026-09-22-analytics-posthog-feature-flags.md`](./2026-09-22-analytics-posthog-feature-flags.md)
are implemented and approved.

## 2. Discovery findings

### Existing auth architecture

- `packages/auth/src/base.ts` owns shared Better Auth configuration.
- `packages/auth/src/index.ts` creates the isolated Next.js Web instance.
- `packages/auth/src/tanstack-start.ts` creates the isolated TanStack Start
  Admin instance. These instances must remain separate because their cookie
  plugins differ.
- `apps/web/src/auth.ts` is only a compatibility export; apps do not create
  their own Better Auth instances.
- Prisma already contains `User.emailVerified` and the Better Auth
  `Verification` model. No schema migration is expected for the basic
  verification flow.
- Email/password is enabled with `autoSignIn: true`; no
  `emailVerification` or email transport is configured.
- Registration currently redirects directly to onboarding after sign-up.
- Login maps all Better Auth failures to a generic invalid-credentials state.
- Better Auth 1.7.1 exposes the required server APIs and options:
  `emailVerification.sendVerificationEmail`, `sendOnSignUp`,
  `autoSignInAfterVerification`, `auth.api.sendVerificationEmail`,
  `auth.api.requestPasswordReset`, and `auth.api.resetPassword`.
- Rate limiting currently exists only as the explicit E2E escape hatch
  `E2E_AUTH_RATE_LIMIT_DISABLED=1`.

### Constraints

- Follow `docs/ERROR_HANDLING_CONVENTION.md`; Better Auth provider errors must
  not leak to users or be reported as unexpected application failures when
  they are expected auth outcomes.
- Do not put tokens, passwords, verification URLs, or raw email addresses in
  logs or analytics.
- Do not hand-edit Better Auth-owned Prisma tables.
- Do not make the browser depend on an unvalidated server environment flag.
- Do not enable verification in CI/E2E until a deterministic mail-capture
  strategy exists.

## 3. Proposed architecture

### 3.1 Reusable feature-flag package

Keep `packages/feature-flags` (`@mini-workout/feature-flags`) as the typed,
provider-neutral flag contract. PostHog evaluation and provider selection now
belong to `@mini-workout/analytics`; auth must consume an injected flag reader,
not parse environment variables or import a PostHog SDK directly.

The package should be framework-agnostic and side-effect free:

```ts
export type FeatureFlagKey = 'auth.emailVerification';

export type FeatureFlagConfig = Readonly<{
  emailVerification: boolean;
}>;

export function parseFeatureFlags(
  env: Record<string, string | undefined>,
): FeatureFlagConfig;
export function isFeatureEnabled(
  config: FeatureFlagConfig,
  key: FeatureFlagKey,
): boolean;
```

Rules:

- Default `auth.emailVerification` to `false`.
- Accept only explicit `0`/`1` (or a documented equivalent); reject malformed
  production values instead of silently enabling a security feature.
- Read `process.env` in the consuming app/package adapter, not at module
  import time inside the reusable package.
- Do not include a remote flag vendor, database, React, Next.js, or Better Auth
  dependency in this package.
- Keep the public flag key stable so future Web/Admin/worker consumers share
  the same contract.

Initial environment contract:

```text
MW_FEATURE_AUTH_EMAIL_VERIFICATION=0|1
```

The server-side auth package will create the config once and pass the boolean
into the shared Better Auth option builder. UI routes receive only a validated
boolean from a server boundary; they never read `process.env` directly.

### 3.2 Auth configuration and transport boundary

Keep the two Better Auth instances isolated, but derive both from a shared
option factory:

```text
feature flags + validated mail transport
                 ↓
        packages/auth/base options
             ↙              ↘
       Web instance      Admin instance
```

Add a small email sender contract owned by `packages/auth` or a dedicated
`packages/email` only if the provider implementation needs a separate runtime
boundary:

```ts
type AuthEmailSender = (input: {
  kind: 'verification' | 'password-reset';
  to: string;
  url: string;
}) => Promise<void>;
```

The contract must receive a fully constructed callback URL from Better Auth,
but the implementation must not log or persist it. **Resend is the approved
first provider**, behind an adapter boundary:

```text
Better Auth callback
        ↓
AuthEmailSender interface
        ↓
ResendEmailProvider (current)
        ↓
provider API
```

The Better Auth option builder, feature flag, templates, and UI must depend on
`AuthEmailSender`, never on the Resend SDK or REST payload. Provider selection
must be configuration-driven and validated at startup. A future SES/Postmark
adapter should only implement the same contract and template renderer.

Use a fake/test transport for local and E2E. Production requires
`RESEND_API_KEY`, a verified `AUTH_EMAIL_FROM`, and an explicit provider
configuration. Provider secrets stay in the consuming runtime and are never
passed to browser code.

Do not make the feature flag true in production until the sender is configured;
fail configuration validation at startup/build rather than silently dropping
verification mail.

### 3.3 Flag-off and flag-on behavior

| Flow                    | Flag off (current compatibility)              | Flag on                                                                                                    |
| ----------------------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Sign-up                 | Existing auto-sign-in and onboarding redirect | Create account, send verification, show verify-email guidance, do not grant app access before verification |
| Sign-in                 | Existing behavior                             | Unverified account receives safe verification-required state and resend path                               |
| Verify link             | Not exposed                                   | Better Auth `/verify-email` endpoint with allowlisted callback and success/error UX                        |
| Resend                  | Not exposed                                   | Generic success response, rate-limited, no account enumeration                                             |
| Password reset          | Not exposed                                   | Request/reset pages backed by Better Auth tokens and generic responses                                     |
| Existing verified users | Unchanged                                     | Unchanged                                                                                                  |

The exact `autoSignIn` behavior must be validated against Better Auth 1.7.1 in a
focused integration test. The safe target is no authenticated product session
until verification succeeds when the flag is enabled.

### 3.4 Rate limiting

Use Better Auth's built-in rate limiter as the first line, with explicit path
profiles for:

- sign-in and sign-up;
- verification email send/resend;
- password-reset request;
- password-reset completion;
- verification token consumption.

The implementation preserves the E2E-only disable switch and tests that any
other value cannot disable production protections. Production uses Better
Auth's database storage backed by shared PostgreSQL. Web Server Actions use a
separate provider-neutral limiter backed by the same table because direct
`auth.api.*` calls do not traverse Better Auth's HTTP `onRequest` limiter. Both
paths consume limits atomically; local development/test stays in-memory or
disabled.

Rate-limit responses must include safe retry metadata where Better Auth
provides it, use generic copy, and never reveal whether an email exists.

## 4. User journeys and acceptance criteria

### Password recovery

1. User opens “Forgot password?” from login.
2. User submits a valid-looking email.
3. UI always shows the same confirmation for known/unknown addresses.
4. Email link opens a reset form with a one-time, expiring token.
5. Invalid, expired, reused, or rate-limited tokens show safe recovery copy.
6. Successful reset invalidates appropriate sessions according to the approved
   Better Auth policy and allows a fresh sign-in.

### Email verification (flagged)

1. Flag-off registration remains backward compatible.
2. Flag-on registration sends exactly one verification message through the
   configured sender and routes to a verify-email state.
3. The verification link is same-origin/allowlisted and cannot become an open
   redirect.
4. Successful verification marks `User.emailVerified = true` through Better
   Auth and presents a clear next step to onboarding/login.
5. Resend is rate-limited and returns the same public response regardless of
   account existence.
6. Sign-in behavior for unverified users is deterministic and covered by an
   integration test.
7. Disabling the flag restores the previous flow without a data migration or
   breaking already verified users.

### Security and observability

- No token, password, callback URL, raw provider error, or email address is
  logged or sent to PostHog.
- Expected invalid credentials, invalid/expired tokens, and rate limits are
  not reported as internal errors.
- Unexpected sender/database failures are classified once at the outer
  boundary with request ID and redacted context.
- Auth endpoints remain `no-store` where they return token/session state.

## 5. Approved decisions and remaining implementation gates

The following decisions are approved for implementation:

1. **Package:** create `@mini-workout/feature-flags`.
2. **Provider:** implement Resend behind `AuthEmailSender`; keep provider
   replacement limited to an adapter/configuration change.
3. **Verification policy:** require verification before app access when the
   flag is on.
4. **Password-reset session policy:** revoke all existing sessions after reset.
5. **Rate-limit store:** use PostgreSQL database storage in production and
   local memory only outside production. Server Actions and `/api/auth/**`
   share the same durable table with separate pseudonymous keys.
6. **Admin behavior:** share the flag/config contract but do not expose Admin
   signup verification UX; provision/verify admin accounts through an explicit
   operator flow.

Remaining gates are operational, not product ambiguity:

- verified Resend sender/domain and environment ownership;
- fake transport and deterministic E2E message capture;
- deployment of the additive `rateLimit` migration before application code;
- preview smoke test with the flag on;

## 6. Implementation update

- The Web auth instance now uses a request-aware Better Auth hook backed by the
  provider-neutral flag reader. Admin remains isolated and does not receive the
  member verification hook.
- The local provider preserves the legacy auto-sign-in flow when disabled.
  Production defaults to the PostHog provider with a safe `false` fallback.
- Rollout identity is an HMAC of the normalized email using the Better Auth
  secret. Raw email is never sent to the flag provider, and the same account
  receives a stable decision across sign-up, sign-in, and resend requests.
- Better Auth memory-adapter integration tests cover flag-off, flag-on,
  verification email delivery, unverified sign-in denial, and disabled resend.
- The basic verification flow requires no user/auth schema change. Rate
  limiting adds an independent `rateLimit` table, so its additive migration
  must be deployed before this code reaches production. Verification
  enablement still requires a verified Resend sender and preview/staging smoke
  evidence.
- Password resets revoke all existing sessions. Integration tests prove token
  one-time use, old-password rejection, and fresh sign-in with the new
  password.
- Production rate limiting uses atomic PostgreSQL consumption. Explicit
  profiles cover sign-in, sign-up, verification, resend, and password-reset
  routes. Both Better Auth HTTP keys and Web Server Action IP/account buckets
  are HMAC-pseudonymized before reaching the provider-neutral store; raw emails
  and addresses are never persisted.
- Recovery actions keep the same public success state during sender/storage
  failures while the shared outer boundary reports unexpected failures once.
  Reset distinguishes stable invalid-token codes from dependency failures, so
  an outage is not misreported to the user as an expired link.
- E2E database servers now use a run-scoped fake email transport. It writes
  structured JSONL callback messages to a temporary file derived from the
  validated disposable database key, resets it at server startup, and is
  rejected in production unless the database is explicitly loopback E2E.
- A dedicated flag-on Playwright config and CI gate now cover registration,
  unverified sign-in guidance, captured verification-link consumption, and the
  onboarding handoff. The existing database suite remains flag-off.
- The same flag-on gate now covers password reset through captured mail,
  session revocation after reset, replay rejection, and invalid-token UX.
- A dedicated durable rate-limit Playwright gate runs against the disposable
  PostgreSQL database with the E2E bypass removed. It verifies the configured
  sign-in budget and safe retry copy using unique pseudonymous IP/account
  buckets, without changing the broad database suite's deterministic behavior.
- The E2E bypass is accepted only when both database variables match a local,
  disposable E2E database. Setting the switch against preview/production
  cannot disable protection.
- Security review of callback allowlists and generic responses remains part of
  the staging rollout gate.

## 6. Planned files and ownership

### New shared package

```text
packages/feature-flags/
  package.json
  src/index.ts
  src/schema.ts
  tests/feature-flags.test.ts
```

### Auth package

- `packages/auth/src/base.ts` — consume validated flags and construct
  verification/recovery/rate-limit options.
- `packages/auth/src/email.ts` or `packages/email/` — approved sender adapter
  and fake transport boundary.
- `packages/auth/tests/base.test.ts` — flag matrix, rate-limit safety, and
  instance option contracts.
- `packages/auth/tests/email.test.ts` — URL handling, provider error mapping,
  redaction, and no-send behavior when disabled.

### Web auth UX

- `apps/web/src/features/auth/register/actions.ts` — flag-aware registration
  outcome and safe redirect.
- `apps/web/src/features/auth/login/actions.ts` — map unverified/rate-limited
  auth errors without message matching.
- `apps/web/src/features/auth/recovery/` — forgot/reset actions, schemas,
  forms, and pages.
- `apps/web/src/features/auth/verification/` — verify state, resend action,
  success/error UX, and feature gate.
- `apps/web/src/app/api/auth/[...all]/route.ts` — preserve Better Auth
  delegation; do not duplicate verification endpoint logic.
- `apps/web/.env.example` — flag and provider variable documentation without
  secrets.

### Cross-app/config

- `turbo.json` — add feature flag env to `globalEnv` if it affects cached build
  output; keep provider secrets out of pass-through env unless strictly needed.
- `apps/admin` — only integrate the shared flag/config contract after the Admin
  policy decision is approved; do not cross-import the Web auth instance.
- `docs/ERROR_HANDLING_CONVENTION.md` — no change expected; implementation must
  follow it.

## 7. Test-first strategy

### Unit tests

- feature flag parsing: default-off, explicit-on, malformed values, and no
  accidental truthiness;
- rate-limit config: production defaults, E2E-only override, and path profiles;
- public error mapping: unverified, invalid token, expired token, rate limited,
  and provider failure;
- callback URL allowlist and no open redirect;
- email sender redaction and no-send behavior.

### Integration tests

- Better Auth sign-up with flag off/on;
- verification email callback receives expected URL without logging it;
- verification endpoint flips `emailVerified` and enforces expiry/reuse;
- resend remains generic and rate-limited;
- password reset request/reset succeeds, token expires, and session policy is
  enforced;
- Web and Admin auth instances remain isolated.

### Browser/E2E tests

Use a deterministic fake mail transport that stores messages only inside the
current E2E run:

- flag-off legacy registration remains green;
- flag-on registration → captured link → verify → onboarding;
- unverified sign-in → generic guidance → resend;
- forgot password → captured link → reset → sign-in;
- invalid/expired link UX;
- repeated resend/reset/sign-in requests produce the expected rate-limit UX.

CI must set the flag explicitly for each suite. No real provider calls or
production credentials are allowed in E2E.

## 7.1 Compatibility and edge-case matrix

The implementation must preserve the old behavior before enabling the new
flag. These cases are release gates, not optional follow-up tests:

| Case                                                 | Required behavior                                                                                                  |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Flag omitted/`0`                                     | Existing registration, auto-sign-in, onboarding redirect, and login behavior remain unchanged                      |
| Existing user with `emailVerified = false`, flag off | Existing user is not unexpectedly locked out                                                                       |
| Existing user with `emailVerified = true`, flag on   | No extra verification prompt; session/onboarding behavior remains unchanged                                        |
| New signup with flag on                              | User record is created once, one verification send is attempted, and no app session is granted before verification |
| Duplicate signup email                               | Safe generic auth response; no account/email enumeration                                                           |
| Resend repeated rapidly                              | Generic response plus rate limit; no token flooding                                                                |
| Resend after account already verified                | Generic success behavior; no unnecessary email disclosure                                                          |
| Expired/reused/malformed token                       | Safe error state; no user/token details; no session creation                                                       |
| Callback URL missing or external                     | Fall back to a same-origin fixed destination; never redirect externally                                            |
| Provider timeout/429/5xx                             | Safe retryable message, one classified dependency report, no password/token logging                                |
| Provider succeeds but redirect/request fails         | Verification state remains authoritative; resend/retry remains safe and idempotent                                 |
| Password reset token replay                          | Reject replay, revoke sessions after first successful reset                                                        |
| Rate limiter unavailable                             | Follow the approved fail-closed policy for sensitive endpoints; never silently disable production protection       |
| E2E override                                         | Only the exact documented E2E environment can relax limits; production/preview values cannot                       |
| Web/Admin reload                                     | Web and TanStack auth singletons remain isolated; no cross-app cookie/plugin import                                |
| Rollback flag to `0`                                 | New verification UI is bypassed without deleting verification records or changing verified users                   |

Implementation order must be incremental: land shared contracts and tests,
then flag-off no-op wiring, then fake-transport flag-on behavior, then Resend
integration, then production configuration. Each stage must keep the legacy
test suite green.

## 8. Verification commands

After implementation:

```bash
pnpm --filter @mini-workout/feature-flags lint
pnpm --filter @mini-workout/feature-flags check-types
pnpm --filter @mini-workout/feature-flags test
pnpm --filter @mini-workout/auth lint
pnpm --filter @mini-workout/auth check-types
pnpm --filter @mini-workout/auth test
pnpm --filter @mini-workout/auth build
pnpm --filter web lint
pnpm --filter web check-types
pnpm --filter web test
pnpm test:e2e
pnpm test:e2e:db
pnpm build
```

Also inspect the production route/auth output and confirm the flag is visible
in build/runtime configuration only through the intended server boundary.

## 9. Rollout and rollback

1. Ship the package and disabled code path with `MW_FEATURE_AUTH_EMAIL_VERIFICATION=0`.
2. Validate fake transport and preview E2E with the flag on.
3. Configure provider/domain/secrets in preview only.
4. Enable for an internal allowlist or preview environment first if the chosen
   flag implementation supports targeting; otherwise use environment-level
   rollout.
5. Monitor verification send failures, resend rate limits, reset completion,
   sign-in rejection, and support events using aggregate, non-PII metrics.
6. Roll back by setting the flag to `0`; do not delete verification records or
   modify `emailVerified` values during a code rollback.

## 10. Risks

| Risk                                                               | Mitigation                                                                      |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| Enabling verification without a working sender locks out new users | Default-off flag, startup config validation, fake transport, preview smoke test |
| Email enumeration through resend/reset                             | Generic response and identical timing where practical                           |
| Open redirect in callback URLs                                     | Same-origin/allowlist parser and tests                                          |
| Rate limiter works only on one Vercel instance                     | Explicit store decision before production                                       |
| Shared auth config accidentally changes Admin                      | Separate instances, option-contract tests, explicit Admin decision              |
| Provider URL/token leaks into logs                                 | Redacted sender adapter and observability tests                                 |
| Existing E2E users become unverified unexpectedly                  | Flag-off CI compatibility and fixture policy; no destructive backfill           |
| Better Auth API drift                                              | Pin current version, test exact installed APIs, review upgrade notes            |

## 11. Review gate

The product decisions are approved. Before production enablement, the team
must still sign off the Resend sender/domain, runtime secrets, shared
rate-limit store, fake transport evidence, and the full compatibility matrix.
