import { z } from 'zod';

export const experienceLevelSchema = z.enum([
  'BEGINNER',
  'INTERMEDIATE',
  'ADVANCED',
]);
export const experienceStepSchema = z.object({
  experienceLevel: experienceLevelSchema,
});
export const interestsStepSchema = z.object({
  interests: z
    .array(z.string().trim().min(1))
    .min(1, 'Choose at least one focus')
    .max(8, 'Choose no more than eight focuses')
    .refine((interests) => new Set(interests).size === interests.length, {
      message: 'Focuses must be unique',
    }),
});
export const scheduleStepSchema = z.object({
  weeklyGoalDays: z.coerce.number().int().min(1).max(7),
});
export const onboardingSchema = experienceStepSchema.merge(interestsStepSchema);
export type OnboardingInput = z.infer<typeof onboardingSchema>;
export type ScheduleStepInput = z.infer<typeof scheduleStepSchema>;

const userIdSchema = z.string().min(1).max(128);
export const saveExperienceInput = z.object({
  userId: userIdSchema,
  experienceLevel: experienceLevelSchema,
});
export const completeRequiredInput = z.object({
  userId: userIdSchema,
  experienceLevel: experienceLevelSchema.optional(),
  interestIds: z.array(z.string().min(1).max(128)).min(1).max(8),
});
export const finishOptionalInput = z.object({
  userId: userIdSchema,
  step: z.literal('WEEKLY_SCHEDULE'),
  skipped: z.boolean(),
  weeklyGoalDays: z.number().int().min(1).max(7).optional(),
});
export type SaveExperienceInput = z.infer<typeof saveExperienceInput>;
export type CompleteRequiredInput = z.infer<typeof completeRequiredInput>;
export type FinishOptionalInput = z.infer<typeof finishOptionalInput>;
