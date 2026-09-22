import { z } from 'zod';

export const workoutInteractionInput = z.object({
  userId: z.string().min(1),
  workoutId: z.string().min(1).max(128),
});

export const setWorkoutLikeInput = workoutInteractionInput.extend({
  liked: z.boolean(),
});

export const setWorkoutFavoriteInput = workoutInteractionInput.extend({
  favorited: z.boolean(),
});

export const workoutDetailInput = z.object({
  userId: z.string().min(1),
  slug: z.string().min(1),
});

export const workoutListInput = z.object({
  userId: z.string().min(1).max(128),
});
export const workoutMetaInput = z.object({ slug: z.string().min(1).max(128) });
export const categorySlugInput = z.object({ slug: z.string().min(1).max(128) });

const optionalSearchText = (max: number) =>
  z.preprocess((value) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
  }, z.string().min(1).max(max).optional());

export const workoutSearchInput = z.object({
  userId: z.string().min(1).max(128),
  query: optionalSearchText(80),
  categorySlug: optionalSearchText(128),
  level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).optional(),
  cursor: optionalSearchText(128),
  limit: z.number().int().min(1).max(24).default(6),
});
export const recommendationInput = workoutListInput.extend({
  experienceLevel: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']),
  interestIds: z.array(z.string().min(1).max(128)),
});

export type WorkoutInteractionInput = z.infer<typeof workoutInteractionInput>;
export type SetWorkoutLikeInput = z.infer<typeof setWorkoutLikeInput>;
export type SetWorkoutFavoriteInput = z.infer<typeof setWorkoutFavoriteInput>;
export type WorkoutDetailInput = z.infer<typeof workoutDetailInput>;
export type WorkoutListInput = z.infer<typeof workoutListInput>;
export type WorkoutMetaInput = z.infer<typeof workoutMetaInput>;
export type CategorySlugInput = z.infer<typeof categorySlugInput>;
export type WorkoutSearchInput = {
  userId: string;
  query?: string;
  categorySlug?: string;
  level?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  cursor?: string;
  limit?: number;
};
export type RecommendationInput = z.infer<typeof recommendationInput>;
