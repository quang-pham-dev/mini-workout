import { NotFoundError } from '../../src/errors';
import * as repository from '../../src/workouts/repository';
import {
  getPublishedWorkoutDetail,
  getRecommendedWorkouts,
  getSavedWorkouts,
  getWorkoutEngagement,
  searchPublishedWorkouts,
  setWorkoutFavorite,
  setWorkoutLike,
} from '../../src/workouts/service';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/workouts/repository');

const workout = vi.mocked(repository.findPublishedWorkoutById);
const engagement = vi.mocked(repository.findWorkoutEngagement);

beforeEach(() => {
  vi.resetAllMocks();
  workout.mockResolvedValue({ slug: 'full-body-flow' });
  engagement.mockResolvedValue({
    workoutId: 'workout-1',
    likeCount: 4,
    liked: true,
    favorited: false,
  });
});

describe('workout interactions', () => {
  it('returns a bounded search page with a cursor only when more rows exist', async () => {
    vi.mocked(repository.findPublishedWorkoutSearch).mockResolvedValue([
      { id: 'a' },
      { id: 'b' },
      { id: 'c' },
    ] as never);

    await expect(
      searchPublishedWorkouts({
        userId: 'user-1',
        query: 'mobility',
        limit: 2,
      }),
    ).resolves.toEqual({
      items: [{ id: 'a' }, { id: 'b' }],
      nextCursor: 'b',
    });
  });

  it('treats blank URL filter values as omitted search filters', async () => {
    vi.mocked(repository.findPublishedWorkoutSearch).mockResolvedValue([]);

    await expect(
      searchPublishedWorkouts({
        userId: 'user-1',
        query: '  ',
        categorySlug: '',
        cursor: '   ',
      }),
    ).resolves.toEqual({ items: [], nextCursor: null });

    expect(repository.findPublishedWorkoutSearch).toHaveBeenCalledWith({
      userId: 'user-1',
      query: undefined,
      categorySlug: undefined,
      cursor: undefined,
      take: 7,
    });
  });

  it('fills recommendations with level matches without repeating interests', async () => {
    vi.mocked(repository.findByInterest).mockResolvedValue([
      { id: 'a' },
    ] as never);
    vi.mocked(repository.findByLevel).mockResolvedValue([{ id: 'b' }] as never);
    await expect(
      getRecommendedWorkouts({
        userId: 'user-1',
        experienceLevel: 'BEGINNER',
        interestIds: ['focus-1'],
      }),
    ).resolves.toEqual([{ id: 'a' }, { id: 'b' }]);
    expect(repository.findByLevel).toHaveBeenCalledWith({
      userId: 'user-1',
      experienceLevel: 'BEGINNER',
      excludeIds: ['a'],
      take: 2,
    });
  });

  it('uses published fallback when no matching workouts exist', async () => {
    vi.mocked(repository.findByInterest).mockResolvedValue([]);
    vi.mocked(repository.findByLevel).mockResolvedValue([]);
    await getRecommendedWorkouts({
      userId: 'user-1',
      experienceLevel: 'BEGINNER',
      interestIds: [],
    });
    expect(repository.findPopular).toHaveBeenCalledWith('user-1', 3);
  });

  it('loads only the current user’s saved workouts', async () => {
    await getSavedWorkouts({ userId: 'user-1' });
    expect(repository.findSaved).toHaveBeenCalledWith('user-1');
  });

  it('sets a like without reading or toggling the current state', async () => {
    await expect(
      setWorkoutLike({
        userId: 'user-123',
        workoutId: 'workout-1',
        liked: true,
      }),
    ).resolves.toEqual({
      workoutId: 'workout-1',
      likeCount: 4,
      liked: true,
      favorited: false,
    });
    expect(repository.insertLikeIfAbsent).toHaveBeenCalledWith(
      'user-123',
      'workout-1',
    );
    expect(repository.findWorkoutEngagement).toHaveBeenCalled();
  });

  it('clears a like even when it is already absent', async () => {
    engagement.mockResolvedValue({
      workoutId: 'workout-1',
      likeCount: 3,
      liked: false,
      favorited: false,
    });
    await expect(
      setWorkoutLike({
        userId: 'user-123',
        workoutId: 'workout-1',
        liked: false,
      }),
    ).resolves.toEqual({
      workoutId: 'workout-1',
      likeCount: 3,
      liked: false,
      favorited: false,
    });
    expect(repository.deleteLikeIfPresent).toHaveBeenCalledWith(
      'user-123',
      'workout-1',
    );
  });

  it('sets favourite state idempotently and returns authoritative engagement', async () => {
    engagement.mockResolvedValue({
      workoutId: 'workout-1',
      likeCount: 4,
      liked: true,
      favorited: true,
    });

    await expect(
      setWorkoutFavorite({
        userId: 'user-123',
        workoutId: 'workout-1',
        favorited: true,
      }),
    ).resolves.toEqual({
      workoutId: 'workout-1',
      likeCount: 4,
      liked: true,
      favorited: true,
    });
    expect(repository.insertFavoriteIfAbsent).toHaveBeenCalledWith(
      'user-123',
      'workout-1',
    );
    expect(repository.findWorkoutEngagement).toHaveBeenCalled();
  });

  it('reads authoritative engagement for a published workout', async () => {
    await expect(
      getWorkoutEngagement({ userId: 'user-123', workoutId: 'workout-1' }),
    ).resolves.toEqual({
      workoutId: 'workout-1',
      likeCount: 4,
      liked: true,
      favorited: false,
    });
    expect(repository.findWorkoutEngagement).toHaveBeenCalledWith(
      'user-123',
      'workout-1',
    );
  });

  it('does not mutate unpublished workouts or invalid input', async () => {
    workout.mockResolvedValueOnce(null);
    await expect(
      setWorkoutLike({
        userId: 'user-123',
        workoutId: 'workout-1',
        liked: true,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(
      setWorkoutLike({ userId: 'user-123', workoutId: '', liked: true }),
    ).rejects.toThrow();
    expect(repository.insertLikeIfAbsent).not.toHaveBeenCalled();
    expect(repository.deleteLikeIfPresent).not.toHaveBeenCalled();
  });

  it('queries a published detail for the requesting user', async () => {
    await getPublishedWorkoutDetail({ userId: 'user-123', slug: 'flow' });
    expect(repository.findPublishedWorkoutDetail).toHaveBeenCalledWith(
      'flow',
      'user-123',
    );
  });
});
