# `@mini-workout/database`

Server-side Prisma client and generated model types. Import `prisma` from this
package in Node runtimes only; it does not contain queries, repositories, auth,
or business rules.

`prisma/schema.prisma`, its migrations, and `prisma/seed.ts` live here as the
single source of truth. Generate the client with
`pnpm --filter @mini-workout/database db:generate`, apply migrations with
`db:migrate` (development) or `db:migrate:deploy` (deployment), and run
`db:seed` only against an explicitly selected database.

The additive `User.role` migration defaults existing and new users to `MEMBER`.
It is not automatically applied by a build or client generation; deploy it
against the intended database before relying on role checks. `apps/web`
Application code must not import this package directly for feature reads or
writes; those go through `@mini-workout/core`. The only direct Web application
database import is `apps/web/src/app/api/health/ready/route.ts`, where the
readiness probe calls the package-owned `pingDatabase()` health primitive.

The additive `rateLimit` migration is required by production authentication.
It stores only pseudonymous bucket keys, counters, and millisecond timestamps;
it is shared by all application instances so limits remain effective across a
multi-instance Vercel deployment. Apply it before deploying code that enables
database-backed auth limiting.
