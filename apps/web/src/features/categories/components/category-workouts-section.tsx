import { getCategoryWorkouts } from '../queries';
import { WorkoutCard } from '@/components/workout-card';
import { requireOnboardedUser } from '@/lib/auth/session';
import { notFound } from 'next/navigation';

type CategoryWorkoutsSectionProps = { slug: string };

const SHIMMER_BASE =
  'animate-shimmer rounded-lg bg-[linear-gradient(90deg,rgb(0_0_0/6%)_25%,rgb(0_0_0/12%)_37%,rgb(0_0_0/6%)_63%)] bg-[length:400%_100%] motion-reduce:animate-none dark:bg-[linear-gradient(90deg,rgb(255_255_255/6%)_25%,rgb(255_255_255/12%)_37%,rgb(255_255_255/6%)_63%)]';

export async function CategoryWorkoutsSection({
  slug,
}: CategoryWorkoutsSectionProps) {
  const { session } = await requireOnboardedUser();
  const result = await getCategoryWorkouts(slug, session.user.id);

  if (!result) notFound();

  return (
    <section aria-labelledby="category-workouts-title">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-highlight">
            Category
          </p>
          <h1
            className="m-0 font-display text-[clamp(2.4rem,6vw,5rem)] leading-[0.95] tracking-[-0.06em]"
            id="category-workouts-title"
          >
            {result.category.name}
          </h1>
        </div>
        <span className="text-sm text-text-tertiary">
          {result.workouts.length}{' '}
          {result.workouts.length === 1 ? 'session' : 'sessions'}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-4 max-[900px]:grid-cols-2 max-[680px]:grid-cols-1">
        {result.workouts.map((workout) => (
          <WorkoutCard
            {...workout}
            key={workout.id}
            viewerId={session.user.id}
            from="category"
          />
        ))}
      </div>
    </section>
  );
}

export function CategoryWorkoutsSkeleton() {
  return (
    <section
      aria-busy="true"
      aria-label="Loading category workouts"
      className="min-h-[32rem]"
    >
      <div className="mb-6 flex items-end justify-between gap-4">
        <div aria-hidden="true">
          <div className={`${SHIMMER_BASE} mb-2 h-3.5 w-20`} />
          <div
            className={`${SHIMMER_BASE} h-[clamp(2.4rem,6vw,5rem)] w-[min(22rem,65vw)]`}
          />
        </div>
        <div aria-hidden="true" className={`${SHIMMER_BASE} h-4 w-20`} />
      </div>

      <div
        aria-hidden="true"
        className="grid grid-cols-3 gap-4 max-[900px]:grid-cols-2 max-[680px]:grid-cols-1"
      >
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            className="overflow-hidden rounded-2xl border border-border-subtle bg-surface"
            key={index}
          >
            <div
              className={`${SHIMMER_BASE} aspect-[1.35] w-full rounded-none`}
            />
            <div className="grid gap-3 p-4">
              <div className="flex items-center justify-between gap-2">
                <div className={`${SHIMMER_BASE} h-3 w-20`} />
                <div className={`${SHIMMER_BASE} h-3 w-12`} />
              </div>
              <div className={`${SHIMMER_BASE} h-5 w-[78%]`} />
              <div className={`${SHIMMER_BASE} h-3.5 w-full`} />
              <div className={`${SHIMMER_BASE} h-3.5 w-[68%]`} />
              <div className={`${SHIMMER_BASE} mt-1 h-3 w-24`} />
              <div className="flex gap-2 pt-1">
                <div className={`${SHIMMER_BASE} h-9 w-16 rounded-full`} />
                <div className={`${SHIMMER_BASE} h-9 w-20 rounded-full`} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
