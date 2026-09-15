import { toAdminCoachView, toAdminWorkoutView } from './contracts';
import type { AdminCoachRow } from '@mini-workout/core/coaches';
import { listAdminCoaches } from '@mini-workout/core/coaches';
import type { AdminWorkoutRow } from '@mini-workout/core/workouts';
import { listAdminWorkouts } from '@mini-workout/core/workouts';

type Page<T> = { items: T[]; nextCursor: string | null };
type PageInput = { userId: string; cursor?: string };

export async function loadAdminWorkoutsPage(
  input: PageInput,
  list: typeof listAdminWorkouts = listAdminWorkouts,
) {
  const page: Page<AdminWorkoutRow> = await list({
    actorId: input.userId,
    cursor: input.cursor,
  });
  return { ...page, items: page.items.map(toAdminWorkoutView) };
}

export async function loadAdminCoachesPage(
  input: PageInput,
  list: typeof listAdminCoaches = listAdminCoaches,
) {
  const page: Page<AdminCoachRow> = await list({
    actorId: input.userId,
    cursor: input.cursor,
  });
  return { ...page, items: page.items.map(toAdminCoachView) };
}
