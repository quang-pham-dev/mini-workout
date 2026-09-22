import { WorkoutSearchQuery } from '../queries';
import { WorkoutCard } from '@/components/workout-card';
import type { WorkoutSearchInput } from '@mini-workout/core/workouts';
import Link from 'next/link';

type WorkoutSearchContentProps = Omit<WorkoutSearchInput, 'userId' | 'limit'>;

function buildSearchHref(input: WorkoutSearchContentProps) {
  const params = new URLSearchParams();
  if (input.query) params.set('q', input.query);
  if (input.categorySlug) params.set('category', input.categorySlug);
  if (input.level) params.set('level', input.level);
  if (input.cursor) params.set('cursor', input.cursor);
  const query = params.toString();
  return query ? `/workouts?${query}` : '/workouts';
}

export async function WorkoutSearchContent({
  query,
  categorySlug,
  level,
  cursor,
}: WorkoutSearchContentProps) {
  const { items, nextCursor, categories, viewerId } = await WorkoutSearchQuery({
    query,
    categorySlug,
    level,
    cursor,
  });

  return (
    <div>
      <header className="max-w-3xl">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-highlight">
          Explore the library
        </p>
        <h1 className="m-0 font-display text-[clamp(2.8rem,7vw,6rem)] leading-[0.9] tracking-[-0.07em]">
          Find your next session.
        </h1>
        <p className="mt-5 max-w-2xl text-[1.05rem] leading-7 text-text-secondary">
          Search by feeling, focus, coach, or category. Keep the filters in the
          URL so your shortlist is easy to return to or share.
        </p>
      </header>

      <form
        className="mt-10 grid gap-3 rounded-3xl border border-border-subtle bg-surface p-4 shadow-[0_1rem_3rem_oklch(0.2_0.02_250/0.06)] sm:grid-cols-[minmax(0,1fr)_auto_auto_auto]"
        method="get"
        action="/workouts"
        role="search"
      >
        <label className="sr-only" htmlFor="workout-search">
          Search workouts
        </label>
        <input
          className="min-h-11 rounded-full border border-border-default bg-surface-raised px-4 text-base text-text-primary outline-none placeholder:text-text-tertiary focus-visible:border-highlight focus-visible:ring-2 focus-visible:ring-ring"
          defaultValue={query}
          id="workout-search"
          name="q"
          placeholder="Try “mobility” or “calm”"
          type="search"
        />
        <label className="sr-only" htmlFor="workout-category">
          Filter by category
        </label>
        <select
          className="min-h-11 rounded-full border border-border-default bg-surface-raised px-4 text-sm text-text-primary outline-none focus-visible:border-highlight focus-visible:ring-2 focus-visible:ring-ring"
          defaultValue={categorySlug ?? ''}
          id="workout-category"
          name="category"
        >
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category.slug} value={category.slug}>
              {category.name}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="workout-level">
          Filter by level
        </label>
        <select
          className="min-h-11 rounded-full border border-border-default bg-surface-raised px-4 text-sm text-text-primary outline-none focus-visible:border-highlight focus-visible:ring-2 focus-visible:ring-ring"
          defaultValue={level ?? ''}
          id="workout-level"
          name="level"
        >
          <option value="">All levels</option>
          <option value="BEGINNER">Beginner</option>
          <option value="INTERMEDIATE">Intermediate</option>
          <option value="ADVANCED">Advanced</option>
        </select>
        <button
          className="min-h-11 rounded-full bg-highlight px-5 font-bold text-highlight-foreground transition hover:brightness-95 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
          type="submit"
        >
          Search
        </button>
      </form>

      <div className="mt-10 flex items-center justify-between gap-4">
        <p className="m-0 text-sm text-text-secondary">
          {items.length === 0
            ? 'No sessions matched those filters.'
            : `${items.length} sessions to explore`}
        </p>
        {(query || categorySlug || level) && (
          <Link
            className="text-sm font-semibold text-text-secondary underline-offset-4 hover:text-text-primary hover:underline"
            href="/workouts"
          >
            Clear filters
          </Link>
        )}
      </div>

      {items.length > 0 ? (
        <div className="mt-4 grid grid-cols-3 gap-4 max-[900px]:grid-cols-2 max-[680px]:grid-cols-1">
          {items.map((workout) => (
            <WorkoutCard
              {...workout}
              key={workout.id}
              viewerId={viewerId}
              from="search"
            />
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-3xl border border-dashed border-border-default bg-surface-raised p-10 text-center">
          <h2 className="m-0 text-xl font-bold">Try a gentler search</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-text-secondary">
            Remove a filter or search for a broader focus to see more sessions.
          </p>
        </div>
      )}

      {(cursor || nextCursor) && (
        <nav
          className="mt-8 flex items-center justify-between border-t border-border-subtle pt-6"
          aria-label="Workout pagination"
        >
          {cursor ? (
            <Link
              className="rounded-full border border-border-default px-4 py-2 text-sm font-semibold text-text-primary no-underline hover:border-border-strong"
              href={buildSearchHref({ query, categorySlug, level })}
            >
              ← Previous
            </Link>
          ) : (
            <span />
          )}
          {nextCursor && (
            <Link
              className="rounded-full bg-highlight px-4 py-2 text-sm font-bold text-highlight-foreground no-underline hover:brightness-95"
              href={buildSearchHref({
                query,
                categorySlug,
                level,
                cursor: nextCursor,
              })}
            >
              Next page →
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
