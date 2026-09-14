import {
  toggleWorkoutFavorite,
  toggleWorkoutLike,
} from '@/features/workouts/actions';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getSessionMock = vi.fn();
const workoutFindFirstMock = vi.fn();
const likeFindUniqueMock = vi.fn();
const likeCreateMock = vi.fn();
const likeDeleteMock = vi.fn();
const favoriteFindUniqueMock = vi.fn();
const favoriteCreateMock = vi.fn();
const favoriteDeleteMock = vi.fn();
const revalidatePathMock = vi.fn();
const redirectMock = vi.fn();

vi.mock('next/headers', () => ({
  headers: vi.fn(async () => new Headers()),
}));

vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => revalidatePathMock(...args),
}));

vi.mock('next/navigation', () => ({
  redirect: (...args: unknown[]) => redirectMock(...args),
}));

vi.mock('@/auth', () => ({
  auth: {
    api: {
      getSession: (...args: unknown[]) => getSessionMock(...args),
    },
  },
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    workout: {
      findFirst: (...args: unknown[]) => workoutFindFirstMock(...args),
    },
    workoutLike: {
      findUnique: (...args: unknown[]) => likeFindUniqueMock(...args),
      create: (...args: unknown[]) => likeCreateMock(...args),
      delete: (...args: unknown[]) => likeDeleteMock(...args),
    },
    workoutFavorite: {
      findUnique: (...args: unknown[]) => favoriteFindUniqueMock(...args),
      create: (...args: unknown[]) => favoriteCreateMock(...args),
      delete: (...args: unknown[]) => favoriteDeleteMock(...args),
    },
  },
}));

describe('Workout Interactions Server Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionMock.mockResolvedValue({ user: { id: 'user-123' } });
    workoutFindFirstMock.mockResolvedValue({ slug: 'full-body-flow' });
  });

  describe('toggleWorkoutLike', () => {
    it('creates a like if none exists and triggers path revalidations', async () => {
      likeFindUniqueMock.mockResolvedValue(null);

      await toggleWorkoutLike('workout-1');

      expect(likeCreateMock).toHaveBeenCalledWith({
        data: { userId: 'user-123', workoutId: 'workout-1' },
      });
      expect(revalidatePathMock).toHaveBeenCalledWith('/home');
      expect(revalidatePathMock).toHaveBeenCalledWith('/favourites');
      expect(revalidatePathMock).toHaveBeenCalledWith(
        '/workouts/full-body-flow',
      );
    });

    it('deletes an existing like when toggled again', async () => {
      likeFindUniqueMock.mockResolvedValue({
        userId: 'user-123',
        workoutId: 'workout-1',
      });

      await toggleWorkoutLike('workout-1');

      expect(likeDeleteMock).toHaveBeenCalledWith({
        where: {
          userId_workoutId: { userId: 'user-123', workoutId: 'workout-1' },
        },
      });
      expect(revalidatePathMock).toHaveBeenCalledWith('/home');
    });

    it('throws error if workout is not published or not found', async () => {
      workoutFindFirstMock.mockResolvedValue(null);

      await expect(toggleWorkoutLike('invalid-id')).rejects.toThrow(
        'Workout not found',
      );
    });
  });

  describe('toggleWorkoutFavorite', () => {
    it('creates a favorite if none exists and triggers revalidations', async () => {
      favoriteFindUniqueMock.mockResolvedValue(null);

      await toggleWorkoutFavorite('workout-1');

      expect(favoriteCreateMock).toHaveBeenCalledWith({
        data: { userId: 'user-123', workoutId: 'workout-1' },
      });
      expect(revalidatePathMock).toHaveBeenCalledWith('/home');
      expect(revalidatePathMock).toHaveBeenCalledWith('/favourites');
      expect(revalidatePathMock).toHaveBeenCalledWith(
        '/workouts/full-body-flow',
      );
    });

    it('deletes an existing favorite when toggled again', async () => {
      favoriteFindUniqueMock.mockResolvedValue({
        userId: 'user-123',
        workoutId: 'workout-1',
      });

      await toggleWorkoutFavorite('workout-1');

      expect(favoriteDeleteMock).toHaveBeenCalledWith({
        where: {
          userId_workoutId: { userId: 'user-123', workoutId: 'workout-1' },
        },
      });
      expect(revalidatePathMock).toHaveBeenCalledWith('/favourites');
    });
  });
});
