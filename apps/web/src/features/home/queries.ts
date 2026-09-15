import { requireOnboardedUser } from '@/lib/auth/session';
import { getLatestWorkouts } from '@mini-workout/core/workouts';
import 'server-only';

export async function getWorkLatest() {
  const { session } = await requireOnboardedUser();
  return getLatestWorkouts({ userId: session.user.id });
}
