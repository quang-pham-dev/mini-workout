import { DELETE, PUT } from '@/app/api/v1/workouts/[id]/like/route';
import { auth } from '@/auth';
import { NotFoundError, ValidationError } from '@mini-workout/core/errors';
import { setWorkoutLike } from '@mini-workout/core/workouts';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/auth', () => ({
  auth: { api: { getSession: vi.fn() } },
}));

vi.mock('@mini-workout/core/workouts', () => ({
  setWorkoutLike: vi.fn(),
}));

const getSession = vi.mocked(auth.api.getSession);
const setLike = vi.mocked(setWorkoutLike);
const context = (id: string) => ({ params: Promise.resolve({ id }) });
const request = (method: 'PUT' | 'DELETE') =>
  new Request('http://localhost/api/v1/workouts/workout-1/like', { method });

beforeEach(() => {
  vi.resetAllMocks();
  getSession.mockResolvedValue({ user: { id: 'user-123' } } as never);
  setLike.mockResolvedValue({ workoutSlug: 'flow', liked: true });
});

describe('workout like REST route', () => {
  it('returns 401 without calling the service when unauthenticated', async () => {
    getSession.mockResolvedValue(null);
    const response = await PUT(request('PUT'), context('workout-1'));
    expect(response.status).toBe(401);
    expect(setLike).not.toHaveBeenCalled();
  });

  it('PUT sets liked state and is private', async () => {
    const response = await PUT(request('PUT'), context('workout-1'));
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toEqual({ workoutSlug: 'flow', liked: true });
    expect(setLike).toHaveBeenCalledWith({
      userId: 'user-123',
      workoutId: 'workout-1',
      liked: true,
    });
  });

  it('DELETE clears liked state', async () => {
    setLike.mockResolvedValue({ workoutSlug: 'flow', liked: false });
    const response = await DELETE(request('DELETE'), context('workout-1'));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      workoutSlug: 'flow',
      liked: false,
    });
    expect(setLike).toHaveBeenCalledWith({
      userId: 'user-123',
      workoutId: 'workout-1',
      liked: false,
    });
  });

  it('maps invalid ids to 400', async () => {
    const response = await PUT(request('PUT'), context(''));
    expect(response.status).toBe(400);
    expect(setLike).not.toHaveBeenCalled();
    expect((await PUT(request('PUT'), context('x'.repeat(129)))).status).toBe(
      400,
    );
  });

  it('maps missing workouts to 404 and validation errors to 400', async () => {
    setLike.mockRejectedValueOnce(new NotFoundError('Workout not found'));
    expect((await PUT(request('PUT'), context('workout-1'))).status).toBe(404);
    setLike.mockRejectedValueOnce(
      new ValidationError([{ path: ['workoutId'] }]),
    );
    expect((await PUT(request('PUT'), context('workout-1'))).status).toBe(400);
  });

  it('returns a safe response for unexpected storage failures', async () => {
    setLike.mockRejectedValue(new Error('database unavailable'));
    const response = await PUT(request('PUT'), context('workout-1'));
    expect(response.status).toBe(500);
    expect(response.headers.get('x-request-id')).toBeTruthy();
    expect(await response.json()).toEqual({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Something went wrong. Please try again.',
        requestId: expect.any(String),
      },
    });
  });
});
