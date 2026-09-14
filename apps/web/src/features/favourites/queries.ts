import { prisma } from '@/lib/db/prisma';
import { withUserId } from '@/lib/utils';
import { WorkoutType } from '@/types/workout';
import 'server-only';

export async function findSavedWorkouts(
  userId: string,
): Promise<WorkoutType[]> {
  return prisma.workout.findMany({
    where: {
      isPublished: true,
      favorites: { some: { userId } },
    },
    orderBy: { favorites: { _count: 'desc' } },
    select: withUserId(userId),
  });
}
