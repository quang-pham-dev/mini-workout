import type { WorkoutType } from '@/types/workout';
import { getSavedWorkouts } from '@mini-workout/core/workouts';
import 'server-only';

export async function findSavedWorkouts(
  userId: string,
): Promise<WorkoutType[]> {
  return getSavedWorkouts({ userId });
}
