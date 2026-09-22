import * as repository from '../../src/workouts/repository';
import { prisma } from '@mini-workout/database';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@mini-workout/database', () => ({
  prisma: {
    workout: { findFirst: vi.fn(), findUnique: vi.fn(), findMany: vi.fn() },
    category: { findMany: vi.fn(), findUnique: vi.fn() },
    workoutLike: {
      findUnique: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    workoutFavorite: {
      findUnique: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

beforeEach(() => vi.clearAllMocks());

describe('workout repository', () => {
  it('lists draft and published workouts with a bounded admin projection', async () => {
    await repository.findAdminWorkouts({ cursor: 'previous', take: 21 });
    expect(prisma.workout.findMany).toHaveBeenCalledWith({
      cursor: { id: 'previous' },
      skip: 1,
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take: 21,
      select: expect.objectContaining({ isPublished: true, title: true }),
    });
    const query = vi.mocked(prisma.workout.findMany).mock.calls[0]?.[0];
    expect(query).not.toHaveProperty('where.isPublished');
    expect(query?.select).not.toHaveProperty('videoUrl');
  });
  it('keeps list queries published and scoped to the requesting user', async () => {
    await repository.findLatest('user-1');
    await repository.findByInterest({
      userId: 'user-1',
      experienceLevel: 'BEGINNER',
      interestIds: ['focus-1'],
    });
    await repository.findByLevel({
      userId: 'user-1',
      experienceLevel: 'BEGINNER',
      excludeIds: ['workout-1'],
      take: 2,
    });
    await repository.findPopular('user-1', 3);
    await repository.findSaved('user-1');

    const calls = vi
      .mocked(prisma.workout.findMany)
      .mock.calls.map(([args]) => args);
    expect(calls).toHaveLength(5);
    for (const query of calls) {
      expect(query?.where).toMatchObject({ isPublished: true });
      expect(query?.select?.likes).toMatchObject({
        where: { userId: 'user-1' },
      });
      expect(query?.select?.favorites).toMatchObject({
        where: { userId: 'user-1' },
      });
    }
    expect(calls[1]?.where).toMatchObject({
      interests: { some: { interestId: { in: ['focus-1'] } } },
    });
    expect(calls[2]?.where).toMatchObject({ id: { notIn: ['workout-1'] } });
    expect(calls[4]?.where).toMatchObject({
      favorites: { some: { userId: 'user-1' } },
    });
    for (const query of calls) {
      expect(query?.select).not.toHaveProperty('videoUrl');
      expect(query?.select).not.toHaveProperty('videoSourceType');
    }
  });

  it('applies search filters and keeps pagination bounded', async () => {
    await repository.findPublishedWorkoutSearch({
      userId: 'user-1',
      query: 'mobility',
      categorySlug: 'mobility',
      level: 'BEGINNER',
      cursor: 'previous',
      take: 7,
    });

    expect(prisma.workout.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        cursor: { id: 'previous' },
        skip: 1,
        take: 7,
        where: expect.objectContaining({
          isPublished: true,
          level: 'BEGINNER',
          category: { slug: 'mobility' },
          OR: expect.arrayContaining([
            { title: { contains: 'mobility', mode: 'insensitive' } },
          ]),
        }),
      }),
    );
  });

  it('reads metadata only for published workouts', async () => {
    await repository.findPublishedMeta('flow');
    expect(prisma.workout.findUnique).toHaveBeenCalledWith({
      where: { slug: 'flow', isPublished: true },
      select: { title: true, description: true },
    });
  });

  it('only finds published workouts by id', async () => {
    await repository.findPublishedWorkoutById('workout-1');
    expect(prisma.workout.findFirst).toHaveBeenCalledWith({
      where: { id: 'workout-1', isPublished: true },
      select: { slug: true },
    });
  });

  it('scopes detail interactions to the requesting user', async () => {
    await repository.findPublishedWorkoutDetail('flow', 'user-123');
    expect(prisma.workout.findUnique).toHaveBeenCalledWith({
      where: { slug: 'flow', isPublished: true },
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
        likes: { where: { userId: 'user-123' }, select: { userId: true } },
        favorites: { where: { userId: 'user-123' }, select: { userId: true } },
      },
    });
  });

  it('reads a published workout engagement projection for one viewer', async () => {
    await repository.findWorkoutEngagement('user-123', 'workout-1');
    expect(prisma.workout.findFirst).toHaveBeenCalledWith({
      where: { id: 'workout-1', isPublished: true },
      select: {
        id: true,
        _count: { select: { likes: true } },
        likes: { where: { userId: 'user-123' }, select: { userId: true } },
        favorites: {
          where: { userId: 'user-123' },
          select: { userId: true },
        },
      },
    });
  });

  it('uses conflict-safe writes when setting like state', async () => {
    await repository.insertLikeIfAbsent('user-123', 'workout-1');
    await repository.deleteLikeIfPresent('user-123', 'workout-1');

    expect(prisma.workoutLike.createMany).toHaveBeenCalledWith({
      data: [{ userId: 'user-123', workoutId: 'workout-1' }],
      skipDuplicates: true,
    });
    expect(prisma.workoutLike.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-123', workoutId: 'workout-1' },
    });
  });

  it('uses conflict-safe writes when setting favourite state', async () => {
    await repository.insertFavoriteIfAbsent('user-123', 'workout-1');
    await repository.deleteFavoriteIfPresent('user-123', 'workout-1');

    expect(prisma.workoutFavorite.createMany).toHaveBeenCalledWith({
      data: [{ userId: 'user-123', workoutId: 'workout-1' }],
      skipDuplicates: true,
    });
    expect(prisma.workoutFavorite.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-123', workoutId: 'workout-1' },
    });
  });
});
