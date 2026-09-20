import { shouldRetryQuery } from '@/lib/query/query-client';
import { WorkoutApiError, fetchWorkoutEngagement } from '@/lib/workouts/api';
import { workoutKeys } from '@/lib/workouts/cache';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('workout engagement query contract', () => {
  it('partitions serializable keys by viewer and workout', () => {
    expect(workoutKeys.engagement('viewer-a', 'workout-1')).toEqual([
      'workouts',
      'engagement',
      'viewer-a',
      'workout-1',
    ]);
    expect(workoutKeys.engagement('viewer-a', 'workout-1')).not.toEqual(
      workoutKeys.engagement('viewer-b', 'workout-1'),
    );
    expect(() =>
      JSON.stringify(workoutKeys.engagement('viewer-a', 'workout-1')),
    ).not.toThrow();
  });

  it('passes cancellation to fetch and parses engagement data', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        workoutId: 'workout-1',
        likeCount: 3,
        liked: true,
        favorited: false,
      }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const controller = new AbortController();

    await expect(
      fetchWorkoutEngagement('workout-1', controller.signal),
    ).resolves.toEqual({
      workoutId: 'workout-1',
      likeCount: 3,
      liked: true,
      favorited: false,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/workouts/workout-1/engagement',
      expect.objectContaining({ signal: controller.signal }),
    );
  });

  it('parses safe API errors and retries only one retryable read', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        Response.json(
          {
            error: {
              code: 'RESOURCE_NOT_FOUND',
              message: 'Workout not found',
              requestId: 'request-1',
            },
          },
          { status: 404 },
        ),
      ),
    );

    await expect(fetchWorkoutEngagement('missing')).rejects.toMatchObject({
      status: 404,
      code: 'RESOURCE_NOT_FOUND',
      requestId: 'request-1',
    });
    expect(
      shouldRetryQuery(
        0,
        new WorkoutApiError({
          status: 404,
          code: 'RESOURCE_NOT_FOUND',
          message: 'Workout not found',
          requestId: 'request-1',
        }),
      ),
    ).toBe(false);
    expect(
      shouldRetryQuery(
        0,
        new WorkoutApiError({
          status: 503,
          code: 'INTERNAL_ERROR',
          message: 'Try again',
          requestId: 'request-2',
        }),
      ),
    ).toBe(true);
    expect(
      shouldRetryQuery(
        1,
        new WorkoutApiError({
          status: 503,
          code: 'INTERNAL_ERROR',
          message: 'Try again',
          requestId: 'request-2',
        }),
      ),
    ).toBe(false);
  });
});
