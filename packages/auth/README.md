# `@mini-workout/auth`

Shared Better Auth instance for Node-based member/admin apps. The package owns
the Prisma adapter, cookie configuration, and role authorization; callers own
request headers, redirects, and HTTP status mapping. Import `./constants`
from Edge code, never the package root (which initializes Prisma).

`requireAdmin(session)` reads the current `User.role` from the database on each
admin operation, so a revoked or stale session claim cannot grant access. Call
it in every privileged Server Action and Route Handler, not only in a proxy.
New accounts default to `MEMBER`; role input is disabled in Better Auth. Promote
admins through a separate, audited operational process—not self-registration.

The existing `mini-workout-session` cookie name remains unchanged. A shared
cookie domain for web/admin is intentionally not enabled until the deployment
domains, HTTPS, and trusted origins are confirmed. Both apps must use the same
`BETTER_AUTH_SECRET`, database, and compatible auth configuration to share
sessions. The additive role migration in `@mini-workout/database` must be
deployed before enabling role-aware auth in production.

Production auth traffic is rate-limited through the shared PostgreSQL
`rateLimit` table. Better Auth protects direct `/api/auth/**` requests, while
the provider-neutral Server Action limiter protects Web actions that call
`auth.api.*` in-process. A provider-neutral store decorator HMACs Better Auth's
HTTP key, and Server Actions independently HMAC account and client-address
buckets. Raw emails and IP addresses are therefore never stored. The bypass
switch works only with matching loopback URLs for a database whose name
contains `e2e`.

Deploy database migrations before deploying auth code. Missing the
`rateLimit` table intentionally fails sensitive production operations closed.
Password reset tokens are one-time and a successful reset revokes all existing
sessions.

Email delivery is provider-neutral. Resend is the default production adapter;
the fake adapter is available only with an absolute capture file and, in
production mode, matching disposable E2E database URLs. It writes structured
JSONL to the run-scoped file so browser tests can consume verification/reset
links without calling an external provider. Never enable the fake provider for
preview or production traffic.
