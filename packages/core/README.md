# `@mini-workout/core`

Framework-agnostic, database-backed application core shared by app entry
points. The workouts
module owns input validation, published-workout checks, interaction behavior,
and workout detail queries. Onboarding and users follow the same split. Each
domain keeps Prisma queries in its repository, and public services return
stable DTOs instead of Prisma Client types.

The coaches module and admin workout list expose bounded, cursor-paginated
projections. They re-check the actor's current database role before reading;
apps must still authenticate `actorId` from a real request.

The core intentionally owns repositories and uses `@mini-workout/database`; it
is not a pure runtime-agnostic domain kernel. Framework concerns such as Next
routes, redirects, cookies, and React remain outside this package.

Callers must resolve and authorize the current user before passing `userId` to
a service. Web Server Actions keep session lookup and Next.js revalidation in
`apps/web`; REST handlers can call the same services later.

The current toggle functions preserve existing web behavior. The REST like
endpoint uses `setWorkoutLike` instead, with idempotent writes based on the
composite database key. Authentication and transport-specific error mapping
remain in the caller.
