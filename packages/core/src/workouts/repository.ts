import { type ExperienceLevel, prisma } from '@mini-workout/database';

export function withUserId(userId: string) {
  return {
    id: true,
    title: true,
    slug: true,
    description: true,
    durationMinutes: true,
    level: true,
    thumbnailUrl: true,
    coach: { select: { name: true, bio: true } },
    category: { select: { name: true } },
    _count: { select: { likes: true } },
    likes: { where: { userId }, select: { userId: true } },
    favorites: { where: { userId }, select: { userId: true } },
  } as const;
}

export type WorkoutCard = {
  id: string;
  title: string;
  slug: string;
  description: string;
  durationMinutes: number;
  level: ExperienceLevel;
  thumbnailUrl: string;
  coach: { name: string; bio: string };
  category: { name: string };
  _count: { likes: number };
  likes: { userId: string }[];
  favorites: { userId: string }[];
};

export type AdminWorkoutRow = {
  id: string;
  title: string;
  slug: string;
  level: ExperienceLevel;
  durationMinutes: number;
  isPublished: boolean;
  updatedAt: Date;
  coach: { name: string };
  category: { name: string };
};

export function findAdminWorkouts(input: {
  cursor?: string;
  take: number;
}): Promise<AdminWorkoutRow[]> {
  return prisma.workout.findMany({
    ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
    orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
    take: input.take,
    select: {
      id: true,
      title: true,
      slug: true,
      level: true,
      durationMinutes: true,
      isPublished: true,
      updatedAt: true,
      coach: { select: { name: true } },
      category: { select: { name: true } },
    },
  });
}

export function findLatest(userId: string, take = 6) {
  return prisma.workout.findMany({
    where: { isPublished: true },
    orderBy: { publishedAt: 'desc' },
    take,
    select: withUserId(userId),
  });
}

export function findByInterest(input: {
  userId: string;
  experienceLevel: ExperienceLevel;
  interestIds: string[];
}) {
  return prisma.workout.findMany({
    where: {
      isPublished: true,
      level: input.experienceLevel,
      interests: { some: { interestId: { in: input.interestIds } } },
    },
    orderBy: { publishedAt: 'desc' },
    take: 3,
    select: withUserId(input.userId),
  });
}

export function findByLevel(input: {
  userId: string;
  experienceLevel: ExperienceLevel;
  excludeIds: string[];
  take: number;
}) {
  return prisma.workout.findMany({
    where: {
      isPublished: true,
      level: input.experienceLevel,
      id: { notIn: input.excludeIds },
    },
    orderBy: { likes: { _count: 'desc' } },
    take: input.take,
    select: withUserId(input.userId),
  });
}

export function findPopular(userId: string, take = 3) {
  return prisma.workout.findMany({
    where: { isPublished: true },
    orderBy: { publishedAt: 'desc' },
    take,
    select: withUserId(userId),
  });
}

export function findSaved(userId: string) {
  return prisma.workout.findMany({
    where: { isPublished: true, favorites: { some: { userId } } },
    orderBy: { favorites: { _count: 'desc' } },
    select: withUserId(userId),
  });
}

export function findPublishedMeta(slug: string) {
  return prisma.workout.findUnique({
    where: { slug, isPublished: true },
    select: { title: true, description: true },
  });
}

export function findPublishedWorkoutById(workoutId: string) {
  return prisma.workout.findFirst({
    where: { id: workoutId, isPublished: true },
    select: { slug: true },
  });
}

export function findPublishedWorkoutDetail(slug: string, userId: string) {
  return prisma.workout.findUnique({
    where: { slug, isPublished: true },
    include: {
      coach: true,
      category: true,
      _count: { select: { likes: true } },
      likes: { where: { userId }, select: { userId: true } },
      favorites: { where: { userId }, select: { userId: true } },
    },
  });
}

export function findLike(userId: string, workoutId: string) {
  return prisma.workoutLike.findUnique({
    where: { userId_workoutId: { userId, workoutId } },
    select: { userId: true, workoutId: true },
  });
}

export function createLike(userId: string, workoutId: string) {
  return prisma.workoutLike.create({ data: { userId, workoutId } });
}

export function insertLikeIfAbsent(userId: string, workoutId: string) {
  return prisma.workoutLike.createMany({
    data: [{ userId, workoutId }],
    skipDuplicates: true,
  });
}

export function deleteLike(userId: string, workoutId: string) {
  return prisma.workoutLike.delete({
    where: { userId_workoutId: { userId, workoutId } },
  });
}

export function deleteLikeIfPresent(userId: string, workoutId: string) {
  return prisma.workoutLike.deleteMany({ where: { userId, workoutId } });
}

export function findFavorite(userId: string, workoutId: string) {
  return prisma.workoutFavorite.findUnique({
    where: { userId_workoutId: { userId, workoutId } },
    select: { userId: true, workoutId: true },
  });
}

export function createFavorite(userId: string, workoutId: string) {
  return prisma.workoutFavorite.create({ data: { userId, workoutId } });
}

export function deleteFavorite(userId: string, workoutId: string) {
  return prisma.workoutFavorite.delete({
    where: { userId_workoutId: { userId, workoutId } },
  });
}
