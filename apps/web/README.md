# Web application

The `web` workspace is the deployable Next.js 16.3 App Router application for
Mini Workout.

## Development

From the repository root:

```bash
pnpm --filter web dev
```

Open <http://localhost:3000>.

The application uses local Geist fonts from `app/fonts` and consumes the shared
UI package through its public exports.

Authentication uses `@mini-workout/auth` (Better Auth email/password) with
database-backed sessions through `@mini-workout/database`. Copy `.env.example` to `.env.local`,
provide `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, and `DATABASE_URL`, then
generate the Prisma client:

```bash
cp apps/web/.env.example apps/web/.env.local
pnpm --filter @mini-workout/database db:generate
```

The Better Auth CLI can regenerate the auth portion of the Prisma schema when
the auth configuration or plugins change. Review the resulting schema diff
before using it: the `User.role` enum and existing migrations are intentional.

```bash
pnpm --filter web auth:generate
```

Apply the first local migration once a PostgreSQL database is available:

```bash
pnpm --filter @mini-workout/database db:migrate
```

Seed the reference interests used by onboarding:

```bash
pnpm --filter @mini-workout/database db:seed
```

The same seed command also creates the first coaches, categories, and published
workout fixtures used by `/home` and `/workouts/[slug]`.

Workout detail pages include a Video.js 10 player for on-demand `MP4` and `HLS`
sources. Each workout stores an explicit `videoSourceType`; the UI does not
infer the adapter from the URL. The player uses the workout thumbnail as its
poster, starts paused, preloads metadata, and uses inline playback on mobile.
Video.js packages are pinned to `10.0.0-rc.2`; reassess the integration when a
stable 10.0.0 release is available.

Prisma CLI reads `packages/database/.env` or an exported `DATABASE_URL`.
Next.js reads `apps/web/.env.local` for development. Keep both URLs pointed at
the same local database and never commit either file.

Email verification is disabled by default with
`MW_FEATURE_AUTH_EMAIL_VERIFICATION=0`. Keep it disabled until a verified
Resend sender (`RESEND_API_KEY` and `AUTH_EMAIL_FROM`) and the PostHog server
flag configuration are ready. Missing credentials or a disabled flag preserve
the existing sign-in and registration behavior; provider secrets are
server-only.

Its route, data, error, network, security, testing, and observability
conventions are documented in
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Commands

```bash
pnpm --filter web lint
pnpm --filter web check-types
pnpm --filter web test
pnpm --filter web build
pnpm --filter web start
```

The root scripts run these tasks through Turborepo and should be preferred when
validating the whole repository.

## Application structure

- `src/app/layout.tsx` — root layout, local fonts, and metadata.
- `src/app/page.tsx` — current landing page.
- `src/app/globals.css` — application-level global styles.
- `src/features/` — feature UI, validation, actions, and presentation logic.
- `src/lib/` — app-wide infrastructure such as auth and Prisma adapters.
- `public/` — static assets.

Application imports use the `@/*` alias for `src/*`. Keep relative imports for
same-folder files such as a page's CSS Module or a feature's local action.

Current authentication and product routes include `/login`, `/register`,
`/onboarding`, `/home`, `/categories/[slug]`, `/workouts` (URL search/filter/
cursor pagination), `/favourites`, `/profile`, `/workouts/[slug]`, and
`/api/auth/[...all]`. Unauthenticated access to protected routes is redirected
to `/login`; users who have not completed onboarding are redirected to
`/onboarding`. Saving favourites and liking workouts are implemented with
database persistence and per-user state.

Playwright currently covers public themes, authentication, onboarding, route
guards, saved/liked workout interactions, deterministic workout playback and
safe media errors, responsive mobile navigation, and profile theme preferences.
Workout completion remains planned product work. Video playback is implemented
on workout detail pages with explicit MP4/HLS source selection. Profile
preference editing and replacement of the current root redirect entry also
require separate product decisions.
