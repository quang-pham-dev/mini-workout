'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/db/prisma';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

async function requireUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user.id) redirect('/login');
  return session.user.id;
}

async function assertPublishedWorkout(workoutId: string) {
  const workout = await prisma.workout.findFirst({
    where: { id: workoutId, isPublished: true },
    select: { slug: true },
  });

  if (!workout) throw new Error('Workout not found');
  return workout.slug;
}

export async function toggleWorkoutLike(workoutId: string) {
  const userId = await requireUser();
  const slug = await assertPublishedWorkout(workoutId);
  const existing = await prisma.workoutLike.findUnique({
    where: { userId_workoutId: { userId, workoutId } },
  });

  if (existing) {
    await prisma.workoutLike.delete({
      where: { userId_workoutId: { userId, workoutId } },
    });
  } else {
    await prisma.workoutLike.create({ data: { userId, workoutId } });
  }

  revalidatePath('/home');
  revalidatePath(`/workouts/${slug}`);
}

export async function toggleWorkoutFavorite(workoutId: string) {
  const userId = await requireUser();
  const slug = await assertPublishedWorkout(workoutId);
  const existing = await prisma.workoutFavorite.findUnique({
    where: { userId_workoutId: { userId, workoutId } },
  });

  if (existing) {
    await prisma.workoutFavorite.delete({
      where: { userId_workoutId: { userId, workoutId } },
    });
  } else {
    await prisma.workoutFavorite.create({ data: { userId, workoutId } });
  }

  revalidatePath('/home');
  revalidatePath(`/workouts/${slug}`);
}
