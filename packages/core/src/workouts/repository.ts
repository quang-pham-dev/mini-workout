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

export type WorkoutDetail = WorkoutCard & {
  videoUrl: string;
  videoSourceType: 'MP4' | 'HLS';
};

export type WorkoutEngagement = {
  workoutId: string;
  likeCount: number;
  liked: boolean;
  favorited: boolean;
};

export type CategorySummary = {
  name: string;
  slug: string;
  workoutCount: number;
};

export type WorkoutSearchResult = {
  items: WorkoutCard[];
  nextCursor: string | null;
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

export function findPublishedCategories(): Promise<CategorySummary[]> {
  return prisma.category
    .findMany({
      where: { workouts: { some: { isPublished: true } } },
      orderBy: { name: 'asc' },
      select: {
        name: true,
        slug: true,
        _count: { select: { workouts: { where: { isPublished: true } } } },
      },
    })
    .then((categories) =>
      categories.map(({ name, slug, _count }) => ({
        name,
        slug,
        workoutCount: _count.workouts,
      })),
    );
}

export async function findPublishedWorkoutsByCategory(
  slug: string,
  userId: string,
) {
  const category = await prisma.category.findUnique({
    where: { slug },
    select: { name: true, slug: true },
  });
  if (!category) return null;

  const workouts = await prisma.workout.findMany({
    where: { category: { slug }, isPublished: true },
    orderBy: { publishedAt: 'desc' },
    select: withUserId(userId),
  });

  return { category, workouts };
}

export async function findPublishedWorkoutSearch(input: {
  userId: string;
  query?: string;
  categorySlug?: string;
  level?: ExperienceLevel;
  cursor?: string;
  take: number;
}): Promise<WorkoutCard[]> {
  const search = input.query
    ? {
        OR: [
          { title: { contains: input.query, mode: 'insensitive' as const } },
          {
            description: {
              contains: input.query,
              mode: 'insensitive' as const,
            },
          },
          {
            coach: {
              name: { contains: input.query, mode: 'insensitive' as const },
            },
          },
          {
            category: {
              name: { contains: input.query, mode: 'insensitive' as const },
            },
          },
        ],
      }
    : {};

  return prisma.workout.findMany({
    where: {
      isPublished: true,
      ...(input.categorySlug ? { category: { slug: input.categorySlug } } : {}),
      ...(input.level ? { level: input.level } : {}),
      ...search,
    },
    ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
    orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
    take: input.take,
    select: withUserId(input.userId),
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

export async function findWorkoutEngagement(
  userId: string,
  workoutId: string,
): Promise<WorkoutEngagement | null> {
  const workout = await prisma.workout.findFirst({
    where: { id: workoutId, isPublished: true },
    select: {
      id: true,
      _count: { select: { likes: true } },
      likes: { where: { userId }, select: { userId: true } },
      favorites: { where: { userId }, select: { userId: true } },
    },
  });

  if (!workout) return null;

  return {
    workoutId: workout.id,
    likeCount: workout._count.likes,
    liked: workout.likes.length > 0,
    favorited: workout.favorites.length > 0,
  };
}

export function findPublishedWorkoutDetail(
  slug: string,
  userId: string,
): Promise<WorkoutDetail | null> {
  return prisma.workout.findUnique({
    where: { slug, isPublished: true },
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      durationMinutes: true,
      level: true,
      videoUrl: true,
      videoSourceType: true,
      thumbnailUrl: true,
      coach: { select: { name: true, bio: true } },
      category: { select: { name: true } },
      _count: { select: { likes: true } },
      likes: { where: { userId }, select: { userId: true } },
      favorites: { where: { userId }, select: { userId: true } },
    },
  });
}

export function insertLikeIfAbsent(userId: string, workoutId: string) {
  return prisma.workoutLike.createMany({
    data: [{ userId, workoutId }],
    skipDuplicates: true,
  });
}

export function deleteLikeIfPresent(userId: string, workoutId: string) {
  return prisma.workoutLike.deleteMany({ where: { userId, workoutId } });
}

export function insertFavoriteIfAbsent(userId: string, workoutId: string) {
  return prisma.workoutFavorite.createMany({
    data: [{ userId, workoutId }],
    skipDuplicates: true,
  });
}

export function deleteFavoriteIfPresent(userId: string, workoutId: string) {
  return prisma.workoutFavorite.deleteMany({ where: { userId, workoutId } });
}
