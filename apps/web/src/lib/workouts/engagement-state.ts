import type { WorkoutEngagement } from '@mini-workout/core/workouts';

type WorkoutEngagementProjection = {
  id: string;
  _count: { likes: number };
  likes: { userId: string }[];
  favorites: { userId: string }[];
};

export function toWorkoutEngagement(
  workout: WorkoutEngagementProjection,
): WorkoutEngagement {
  return {
    workoutId: workout.id,
    likeCount: workout._count.likes,
    liked: workout.likes.length > 0,
    favorited: workout.favorites.length > 0,
  };
}

export function applyLikePreference(
  current: WorkoutEngagement,
  liked: boolean,
): WorkoutEngagement {
  if (current.liked === liked) return current;

  return {
    ...current,
    liked,
    likeCount: Math.max(0, current.likeCount + (liked ? 1 : -1)),
  };
}

export function applyFavoritePreference(
  current: WorkoutEngagement,
  favorited: boolean,
): WorkoutEngagement {
  if (current.favorited === favorited) return current;
  return { ...current, favorited };
}
