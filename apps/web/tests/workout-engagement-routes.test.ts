import { GET as getEngagement } from '@/app/api/v1/workouts/[id]/engagement/route';
import {
  PUT as addFavorite,
  DELETE as removeFavorite,
} from '@/app/api/v1/workouts/[id]/favorite/route';
import { auth } from '@/auth';
import {
  getWorkoutEngagement,
  setWorkoutFavorite,
} from '@mini-workout/core/workouts';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/auth', () => ({
  auth: { api: { getSession: vi.fn() } },
}));

vi.mock('@mini-workout/core/workouts', () => ({
  getWorkoutEngagement: vi.fn(),
  setWorkoutFavorite: vi.fn(),
}));

const getSession = vi.mocked(auth.api.getSession);
const getEngagementService = vi.mocked(getWorkoutEngagement);
const setFavoriteService = vi.mocked(setWorkoutFavorite);
const engagement = {
  workoutId: 'workout-1',
  likeCount: 4,
  liked: true,
  favorited: false,
};
const context = (id: string) => ({ params: Promise.resolve({ id }) });
const request = (path: string, method = 'GET') =>
  new Request(`http://localhost${path}`, { method });

beforeEach(() => {
  vi.resetAllMocks();
  getSession.mockResolvedValue({ user: { id: 'user-123' } } as never);
  getEngagementService.mockResolvedValue(engagement);
  setFavoriteService.mockResolvedValue(engagement);
});

describe('workout engagement routes', () => {
  it('returns private authoritative engagement for the session viewer', async () => {
    const response = await getEngagement(
      request('/api/v1/workouts/workout-1/engagement'),
      context('workout-1'),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toEqual(engagement);
    expect(getEngagementService).toHaveBeenCalledWith({
      userId: 'user-123',
      workoutId: 'workout-1',
    });
  });

  it('uses idempotent desired state for favourite writes', async () => {
    await addFavorite(
      request('/api/v1/workouts/workout-1/favorite', 'PUT'),
      context('workout-1'),
    );
    await removeFavorite(
      request('/api/v1/workouts/workout-1/favorite', 'DELETE'),
      context('workout-1'),
    );

    expect(setFavoriteService).toHaveBeenNthCalledWith(1, {
      userId: 'user-123',
      workoutId: 'workout-1',
      favorited: true,
    });
    expect(setFavoriteService).toHaveBeenNthCalledWith(2, {
      userId: 'user-123',
      workoutId: 'workout-1',
      favorited: false,
    });
  });

  it('rejects unauthenticated and invalid requests before core access', async () => {
    getSession.mockResolvedValueOnce(null);
    expect(
      (
        await getEngagement(
          request('/api/v1/workouts/workout-1/engagement'),
          context('workout-1'),
        )
      ).status,
    ).toBe(401);
    expect(
      (
        await addFavorite(
          request('/api/v1/workouts//favorite', 'PUT'),
          context(''),
        )
      ).status,
    ).toBe(400);
    expect(getEngagementService).not.toHaveBeenCalled();
    expect(setFavoriteService).not.toHaveBeenCalled();
  });
});
