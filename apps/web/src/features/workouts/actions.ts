'use server';

import { auth } from '@/auth';
import { withServerActionErrorBoundary } from '@/lib/observability/action-error';
import {
  toggleWorkoutFavorite as toggleFavorite,
  toggleWorkoutLike as toggleLike,
} from '@mini-workout/core/workouts';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

async function requireUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user.id) redirect('/login');
  return session.user.id;
}

export async function toggleWorkoutLike(workoutId: string) {
  return withServerActionErrorBoundary('workout.like.toggle', async () => {
    const userId = await requireUser();
    const { workoutSlug } = await toggleLike({ userId, workoutId });

    revalidatePath('/home');
    revalidatePath('/favourites');
    revalidatePath(`/workouts/${workoutSlug}`);
  });
}

export async function toggleWorkoutFavorite(workoutId: string) {
  return withServerActionErrorBoundary('workout.favorite.toggle', async () => {
    const userId = await requireUser();
    const { workoutSlug } = await toggleFavorite({ userId, workoutId });

    revalidatePath('/home');
    revalidatePath('/favourites');
    revalidatePath(`/workouts/${workoutSlug}`);
  });
}
