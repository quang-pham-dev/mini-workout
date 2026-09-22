import { requireOnboardedUser } from '@/lib/auth/session';
import { getCachedWorkoutCategories } from '@/lib/workouts/catalog';
import {
  getPublishedWorkoutDetail,
  searchPublishedWorkouts,
} from '@mini-workout/core/workouts';

type WorkoutDetailQueryProps = {
  slug: string;
};

export async function WorkoutDetailQuery({ slug }: WorkoutDetailQueryProps) {
  const { session } = await requireOnboardedUser();

  return {
    viewerId: session.user.id,
    workout: await getPublishedWorkoutDetail({
      slug,
      userId: session.user.id,
    }),
  };
}

export async function WorkoutSearchQuery(input: {
  query?: string;
  categorySlug?: string;
  level?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  cursor?: string;
}) {
  const { session } = await requireOnboardedUser();
  const [page, categories] = await Promise.all([
    searchPublishedWorkouts({ ...input, userId: session.user.id, limit: 6 }),
    getCachedWorkoutCategories(),
  ]);

  return { ...page, categories, viewerId: session.user.id };
}
