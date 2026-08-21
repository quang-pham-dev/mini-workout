import { z } from 'zod';

export const experienceLevelSchema = z.enum([
  'BEGINNER',
  'INTERMEDIATE',
  'ADVANCED',
]);

export const onboardingSchema = z.object({
  experienceLevel: experienceLevelSchema,
  interests: z
    .array(z.string().trim().min(1))
    .min(1, 'Choose at least one focus')
    .max(8, 'Choose no more than eight focuses')
    .refine((interests) => new Set(interests).size === interests.length, {
      message: 'Focuses must be unique',
    }),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;
