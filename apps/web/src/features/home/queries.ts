import { requireOnboardedUser } from '@/lib/auth/session';
import { getCachedWorkoutCategories } from '@/lib/workouts/catalog';
import { getLatestWorkouts } from '@mini-workout/core/workouts';
import 'server-only';

export async function getWorkLatest() {
  const { session } = await requireOnboardedUser();
  return {
    viewerId: session.user.id,
    workouts: await getLatestWorkouts({ userId: session.user.id }),
  };
}

export const getCategories = getCachedWorkoutCategories;
