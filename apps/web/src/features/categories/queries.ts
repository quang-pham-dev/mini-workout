import { getCachedWorkoutCategories } from '@/lib/workouts/catalog';
import { getPublishedWorkoutsByCategory } from '@mini-workout/core/workouts';
import 'server-only';

export const getCategories = getCachedWorkoutCategories;

export async function getCategoryWorkouts(slug: string, userId: string) {
  return getPublishedWorkoutsByCategory({ slug, userId });
}
