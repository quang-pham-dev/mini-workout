import {
  applyFavoritePreference,
  applyLikePreference,
  toWorkoutEngagement,
} from '@/lib/workouts/engagement-state';
import { describe, expect, it } from 'vitest';

describe('workout engagement state', () => {
  const engagement = {
    workoutId: 'workout-1',
    likeCount: 3,
    liked: false,
    favorited: false,
  };

  it('maps the RSC workout projection to the shared query DTO', () => {
    expect(
      toWorkoutEngagement({
        id: 'workout-1',
        _count: { likes: 3 },
        likes: [{ userId: 'viewer-1' }],
        favorites: [],
      }),
    ).toEqual({
      workoutId: 'workout-1',
      likeCount: 3,
      liked: true,
      favorited: false,
    });
  });

  it('applies an explicit like preference without double-counting', () => {
    const liked = applyLikePreference(engagement, true);

    expect(liked).toEqual({ ...engagement, liked: true, likeCount: 4 });
    expect(applyLikePreference(liked, true)).toEqual(liked);
    expect(applyLikePreference(liked, false)).toEqual(engagement);
  });

  it('never makes the optimistic like count negative', () => {
    expect(
      applyLikePreference({ ...engagement, likeCount: 0, liked: true }, false)
        .likeCount,
    ).toBe(0);
  });

  it('updates favorite state without changing like state', () => {
    expect(applyFavoritePreference(engagement, true)).toEqual({
      ...engagement,
      favorited: true,
    });
  });
});
