import { z } from 'zod';

export const workoutInteractionInput = z.object({
  userId: z.string().min(1),
  workoutId: z.string().min(1).max(128),
});

export const setWorkoutLikeInput = workoutInteractionInput.extend({
  liked: z.boolean(),
});

export const workoutDetailInput = z.object({
  userId: z.string().min(1),
  slug: z.string().min(1),
});

export const workoutListInput = z.object({
  userId: z.string().min(1).max(128),
});
export const workoutMetaInput = z.object({ slug: z.string().min(1).max(128) });
export const recommendationInput = workoutListInput.extend({
  experienceLevel: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']),
  interestIds: z.array(z.string().min(1).max(128)),
});

export type WorkoutInteractionInput = z.infer<typeof workoutInteractionInput>;
export type SetWorkoutLikeInput = z.infer<typeof setWorkoutLikeInput>;
export type WorkoutDetailInput = z.infer<typeof workoutDetailInput>;
export type WorkoutListInput = z.infer<typeof workoutListInput>;
export type WorkoutMetaInput = z.infer<typeof workoutMetaInput>;
export type RecommendationInput = z.infer<typeof recommendationInput>;
