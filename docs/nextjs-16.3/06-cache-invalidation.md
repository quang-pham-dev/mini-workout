# Experiment 10 — Cache Invalidation

## Tag registry

All web cache tags are defined in `apps/web/src/lib/cache/tags.ts`:

- `workout-categories` — published category catalogue;
- `workouts` — published workout collection;
- `workout:<slug>` — one workout's public metadata;
- `onboarding:<userId>` — reserved for future cached onboarding summaries.

Feature code must use these factories instead of inventing tag strings.

## Revalidation API

`apps/web/src/lib/cache/revalidate.ts` is the only web module that calls
`updateTag()`. It exposes collection and entity helpers so a mutation can
invalidate the collection and, when needed, one entity after the write has
completed.

`updateTag()` is appropriate for Server Actions because the current request
must see fresh data. A future webhook or Route Handler should use
`revalidateTag(tag, 'max')` for stale-while-revalidate behavior instead of the
deprecated one-argument form.

## Current mutation boundary

Like/favourite state is fetched through the viewer-scoped engagement API and is
not part of the shared published metadata cache. Those mutations therefore do
not invalidate the public workout metadata tag. If workout publication or
metadata editing is added to the web mutation boundary, call
`revalidateWorkoutCache(slug)` after the database write; category publication
should call `revalidateWorkoutLibraryCache()`.

## Safety rules

1. Write to the database first, then invalidate.
2. Never put `cookies()`, `headers()`, or `auth()` inside a `use cache` body.
3. Keep personalized data outside shared cache entries unless the user ID is
   an explicit cache-key argument.
4. Run a production build and inspect static/dynamic output before changing
   cache boundaries.
