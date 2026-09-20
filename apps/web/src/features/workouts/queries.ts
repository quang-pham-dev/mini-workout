import { requireOnboardedUser } from '@/lib/auth/session';
import { getPublishedWorkoutDetail } from '@mini-workout/core/workouts';

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
