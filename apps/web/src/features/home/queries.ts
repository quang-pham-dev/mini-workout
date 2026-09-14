import { requireOnboardedUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { withUserId } from '@/lib/utils';
import type { WorkoutType } from '@/types/workout';
import { ExperienceLevel } from '@prisma/client';
import 'server-only';

export async function getWorkLatest() {
  const { session } = await requireOnboardedUser();
  return await prisma.workout.findMany({
    where: { isPublished: true },
    orderBy: { publishedAt: 'desc' },
    take: 6,
    select: withUserId(session.user.id),
  });
}

type FindByInterestParams = {
  userId: string;
  experienceLevel: ExperienceLevel;
  interestIds: string[];
};

export async function findWorkoutsByInterest({
  userId,
  experienceLevel,
  interestIds,
}: FindByInterestParams): Promise<WorkoutType[]> {
  return prisma.workout.findMany({
    where: {
      isPublished: true,
      level: experienceLevel,
      interests: { some: { interestId: { in: interestIds } } },
    },
    orderBy: { publishedAt: 'desc' },
    take: 3,
    select: withUserId(userId),
  });
}

type FindByLevelParams = {
  userId: string;
  experienceLevel: ExperienceLevel;
  excludeIds: string[];
  take: number;
};

export async function findWorkoutsByLevel({
  userId,
  experienceLevel,
  excludeIds,
  take,
}: FindByLevelParams): Promise<WorkoutType[]> {
  if (take <= 0) return [];
  return prisma.workout.findMany({
    where: {
      isPublished: true,
      level: experienceLevel,
      id: { notIn: excludeIds },
    },
    orderBy: { likes: { _count: 'desc' } },
    take,
    select: withUserId(userId),
  });
}

export async function findPopularWorkouts(
  userId: string,
  take = 3,
): Promise<WorkoutType[]> {
  return prisma.workout.findMany({
    where: { isPublished: true },
    orderBy: { publishedAt: 'desc' },
    take,
    select: withUserId(userId),
  });
}
