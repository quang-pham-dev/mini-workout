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
