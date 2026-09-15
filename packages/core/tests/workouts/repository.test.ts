import * as repository from '../../src/workouts/repository';
import { prisma } from '@mini-workout/database';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@mini-workout/database', () => ({
  prisma: {
    workout: { findFirst: vi.fn(), findUnique: vi.fn(), findMany: vi.fn() },
    workoutLike: {
      findUnique: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    workoutFavorite: { findUnique: vi.fn(), create: vi.fn(), delete: vi.fn() },
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
      include: {
        coach: true,
        category: true,
        _count: { select: { likes: true } },
        likes: { where: { userId: 'user-123' }, select: { userId: true } },
        favorites: { where: { userId: 'user-123' }, select: { userId: true } },
      },
    });
  });

  it('uses the composite key for like reads and writes', async () => {
    await repository.findLike('user-123', 'workout-1');
    await repository.createLike('user-123', 'workout-1');
    await repository.deleteLike('user-123', 'workout-1');

    expect(prisma.workoutLike.findUnique).toHaveBeenCalledWith({
      where: {
        userId_workoutId: { userId: 'user-123', workoutId: 'workout-1' },
      },
      select: { userId: true, workoutId: true },
    });
    expect(prisma.workoutLike.create).toHaveBeenCalledWith({
      data: { userId: 'user-123', workoutId: 'workout-1' },
    });
    expect(prisma.workoutLike.delete).toHaveBeenCalledWith({
      where: {
        userId_workoutId: { userId: 'user-123', workoutId: 'workout-1' },
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

  it('uses the composite key for favourite reads and writes', async () => {
    await repository.findFavorite('user-123', 'workout-1');
    await repository.createFavorite('user-123', 'workout-1');
    await repository.deleteFavorite('user-123', 'workout-1');

    expect(prisma.workoutFavorite.findUnique).toHaveBeenCalledWith({
      where: {
        userId_workoutId: { userId: 'user-123', workoutId: 'workout-1' },
      },
      select: { userId: true, workoutId: true },
    });
    expect(prisma.workoutFavorite.create).toHaveBeenCalledWith({
      data: { userId: 'user-123', workoutId: 'workout-1' },
    });
    expect(prisma.workoutFavorite.delete).toHaveBeenCalledWith({
      where: {
        userId_workoutId: { userId: 'user-123', workoutId: 'workout-1' },
      },
    });
  });
});
