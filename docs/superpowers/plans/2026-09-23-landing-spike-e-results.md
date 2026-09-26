# Landing Spike E — Cross-Subdomain Attribution

**Status:** MVP aggregate-only fallback approved; per-user exchange deferred  
**Date:** 2026-09-23  
**Scope:** Protocol/security investigation; no attribution endpoint, cookie or analytics code was added.

## Question

Can sanitized first-touch campaign context cross from `example.com` to
`app.example.com` without sharing the authentication cookie, carrying PII, or
trusting browser-supplied analytics identity?

## Findings

- Keep Better Auth cookies host-only on `app.example.com`; do not broaden cookie
  scope to `.example.com` for attribution.
- UTM values are user-controlled input. A Landing signature can protect the
  integrity of a payload after issuance, but it does not prove the original UTM
  claim was truthful. Attribution is measurement, not authorization; never use
  it to grant discounts, access, or other benefits without a separate
  anti-fraud design.
- A signed opaque token in a query string is still exposed to browser history,
  edge/server access logs and potentially referrer propagation. If query
  transport is selected, strip it on the first Product response, use a strict
  `Referrer-Policy`, redact query values from every log/telemetry layer, and
  never place PII or a PostHog distinct ID in the payload.
- A same-tab HTML `POST` handoff can avoid putting the token in a URL, but a
  static Landing page cannot mint a server-signed token by itself. A narrowly
  scoped Landing issuer or another trusted issuance path is needed. A purely
  client-signed payload is not trusted.
- Replay prevention requires state: token consumption must be atomic (for
  example, a short-lived record deleted/marked consumed in a transaction or KV
  compare-and-set). A valid signature and expiry alone do not prevent replay.
- Signup must proceed if attribution is missing, expired, rejected, JavaScript
  is unavailable, consent is denied or the issuer is unavailable. Product may
  store only a validated allowlist of attribution fields after exchange.
- The exact consent boundary is a product/legal decision. Do not make
  non-essential cross-domain attribution or PostHog collection happen before
  the approved consent signal.

## Proposed sequence for a future integration spike

1. Landing collects bounded, allowlisted UTM fields and obtains an opaque,
   short-lived one-time handoff from a trusted server endpoint only when the
   consent policy permits it.
2. Browser submits the token to a same-tab Product exchange endpoint using a
   POST form; token is never logged, and response redirects to the requested
   signup route after consumption.
3. Product validates signature/expiry and atomically consumes the nonce,
   sanitizes stored values again, and associates them only with a later
   server-verified signup.
4. Failure is best-effort: continue to signup without attribution and report
   only a sanitized stable error code/request ID under the repository error
   convention.

This is a proposal, not a selected implementation. The team must choose the
consent behavior, trusted issuer ownership, retention window and whether the
measurement value justifies stateful one-time exchange before Phase 5.

## Gate decision

**MVP decision gate passed by fallback.** Report consented Landing campaign
activity and Product conversions only as separate aggregates. Do not attempt
per-user attribution exchange in the MVP. Executable token, replay/tampering,
log-redaction and cross-domain E2E tests become prerequisites only if the team
later approves an individual-level join, issuer ownership, consent behavior and
retention policy.
