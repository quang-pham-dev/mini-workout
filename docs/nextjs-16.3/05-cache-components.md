# Experiment 09 — Cache Components and `use cache`

## Scope

Mini Workout already enables Cache Components in `apps/web/next.config.ts`.
This experiment applies caching only to shared, published reads:

- published workout metadata used by `/workouts/[slug]` metadata;
- the published category catalogue used by home, category discovery, and
  search filters.

Personalized workout cards remain outside the shared cache boundary because
their engagement state is scoped to the signed-in viewer.

## Implementation

The cached functions live in feature-owned server query modules. Each cached
function starts with `use cache`, declares an explicit `cacheLife('hours')`, and
registers a tag from `apps/web/src/lib/cache/tags.ts`.

Pages remain orchestration components. They resolve route parameters and render
Suspense boundaries; they do not own the cache policy.

## Observation

The cache key includes function arguments. Workout metadata is therefore keyed
by `slug`, while the category catalogue is a shared collection entry. Auth and
viewer-specific reads stay outside these cached functions.

## Trade-offs

Caching the full home/search result would incorrectly mix viewer engagement
state between users. The current boundary gives shared catalogue/metadata
reads a cacheable path without weakening authorization or personalization.

## Verification

- `cacheComponents: true` is enabled.
- Cached functions use both `cacheLife` and `cacheTag`.
- No cached function reads cookies, headers, or auth state.
- `pnpm --filter web check-types` and `pnpm --filter web lint` pass.
