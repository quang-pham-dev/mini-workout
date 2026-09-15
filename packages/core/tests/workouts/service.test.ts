import { NotFoundError, ValidationError } from '../../src/errors';
import * as repository from '../../src/workouts/repository';
import {
  getPublishedWorkoutDetail,
  getRecommendedWorkouts,
  getSavedWorkouts,
  setWorkoutLike,
  toggleWorkoutFavorite,
  toggleWorkoutLike,
} from '../../src/workouts/service';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/workouts/repository');

const workout = vi.mocked(repository.findPublishedWorkoutById);
const like = vi.mocked(repository.findLike);
const favorite = vi.mocked(repository.findFavorite);

beforeEach(() => {
  vi.resetAllMocks();
  workout.mockResolvedValue({ slug: 'full-body-flow' });
});

describe('workout interactions', () => {
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
    ).resolves.toEqual({ workoutSlug: 'full-body-flow', liked: true });
    expect(repository.insertLikeIfAbsent).toHaveBeenCalledWith(
      'user-123',
      'workout-1',
    );
    expect(repository.findLike).not.toHaveBeenCalled();
  });

  it('clears a like even when it is already absent', async () => {
    await expect(
      setWorkoutLike({
        userId: 'user-123',
        workoutId: 'workout-1',
        liked: false,
      }),
    ).resolves.toEqual({ workoutSlug: 'full-body-flow', liked: false });
    expect(repository.deleteLikeIfPresent).toHaveBeenCalledWith(
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

  it('creates a like for a published workout', async () => {
    like.mockResolvedValue(null);

    await expect(
      toggleWorkoutLike({ userId: 'user-123', workoutId: 'workout-1' }),
    ).resolves.toEqual({ workoutSlug: 'full-body-flow', active: true });
    expect(repository.createLike).toHaveBeenCalledWith('user-123', 'workout-1');
  });

  it('removes an existing like', async () => {
    like.mockResolvedValue({ userId: 'user-123', workoutId: 'workout-1' });

    await expect(
      toggleWorkoutLike({ userId: 'user-123', workoutId: 'workout-1' }),
    ).resolves.toEqual({ workoutSlug: 'full-body-flow', active: false });
    expect(repository.deleteLike).toHaveBeenCalledWith('user-123', 'workout-1');
  });

  it('rejects an unpublished or missing workout before mutating', async () => {
    workout.mockResolvedValue(null);

    await expect(
      toggleWorkoutLike({ userId: 'user-123', workoutId: 'workout-1' }),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(repository.findLike).not.toHaveBeenCalled();
  });

  it('validates identifiers before accessing storage', async () => {
    await expect(
      toggleWorkoutLike({ userId: '', workoutId: 'workout-1' }),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(repository.findPublishedWorkoutById).not.toHaveBeenCalled();
  });

  it('creates and removes favourites through the same domain contract', async () => {
    favorite.mockResolvedValueOnce(null).mockResolvedValueOnce({
      userId: 'user-123',
      workoutId: 'workout-1',
    });

    await expect(
      toggleWorkoutFavorite({ userId: 'user-123', workoutId: 'workout-1' }),
    ).resolves.toEqual({ workoutSlug: 'full-body-flow', active: true });
    await expect(
      toggleWorkoutFavorite({ userId: 'user-123', workoutId: 'workout-1' }),
    ).resolves.toEqual({ workoutSlug: 'full-body-flow', active: false });
    expect(repository.createFavorite).toHaveBeenCalledOnce();
    expect(repository.deleteFavorite).toHaveBeenCalledOnce();
  });

  it('queries a published detail for the requesting user', async () => {
    await getPublishedWorkoutDetail({ userId: 'user-123', slug: 'flow' });
    expect(repository.findPublishedWorkoutDetail).toHaveBeenCalledWith(
      'flow',
      'user-123',
    );
  });
});
