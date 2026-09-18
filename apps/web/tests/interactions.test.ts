import {
  toggleWorkoutFavorite,
  toggleWorkoutLike,
} from '@/lib/workouts/actions';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getSessionMock = vi.fn();
const toggleLikeMock = vi.fn();
const toggleFavoriteMock = vi.fn();
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
    api: { getSession: (...args: unknown[]) => getSessionMock(...args) },
  },
}));

vi.mock('@mini-workout/core/workouts', () => ({
  toggleWorkoutLike: (...args: unknown[]) => toggleLikeMock(...args),
  toggleWorkoutFavorite: (...args: unknown[]) => toggleFavoriteMock(...args),
}));

describe('Workout Interactions Server Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionMock.mockResolvedValue({ user: { id: 'user-123' } });
    toggleLikeMock.mockResolvedValue({ workoutSlug: 'full-body-flow' });
    toggleFavoriteMock.mockResolvedValue({ workoutSlug: 'full-body-flow' });
  });

  it('passes the authenticated user to the like service and revalidates paths', async () => {
    await toggleWorkoutLike('workout-1');

    expect(toggleLikeMock).toHaveBeenCalledWith({
      userId: 'user-123',
      workoutId: 'workout-1',
    });
    expect(revalidatePathMock).toHaveBeenCalledWith('/home');
    expect(revalidatePathMock).toHaveBeenCalledWith('/favourites');
    expect(revalidatePathMock).toHaveBeenCalledWith('/workouts/full-body-flow');
  });

  it('passes the authenticated user to the favourite service and revalidates paths', async () => {
    await toggleWorkoutFavorite('workout-1');

    expect(toggleFavoriteMock).toHaveBeenCalledWith({
      userId: 'user-123',
      workoutId: 'workout-1',
    });
    expect(revalidatePathMock).toHaveBeenCalledWith('/home');
    expect(revalidatePathMock).toHaveBeenCalledWith('/favourites');
    expect(revalidatePathMock).toHaveBeenCalledWith('/workouts/full-body-flow');
  });

  it('does not revalidate when the service rejects the mutation', async () => {
    toggleLikeMock.mockRejectedValue(new Error('Workout not found'));

    await expect(toggleWorkoutLike('invalid-id')).rejects.toThrow(
      'Workout not found',
    );
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it('does not call the service without a session', async () => {
    getSessionMock.mockResolvedValue(null);
    redirectMock.mockImplementation(() => {
      throw new Error('redirected');
    });

    await expect(toggleWorkoutLike('workout-1')).rejects.toThrow('redirected');
    expect(toggleLikeMock).not.toHaveBeenCalled();
  });
});
