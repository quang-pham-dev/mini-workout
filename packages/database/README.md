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
imports this client directly only for its Better Auth Prisma adapter; feature
reads and writes go through `@mini-workout/core`.
