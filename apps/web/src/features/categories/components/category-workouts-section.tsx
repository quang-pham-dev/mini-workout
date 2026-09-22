import { getCategoryWorkouts } from '../queries';
import { WorkoutCard } from '@/components/workout-card';
import { requireOnboardedUser } from '@/lib/auth/session';
import { notFound } from 'next/navigation';

type CategoryWorkoutsSectionProps = { slug: string };

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
