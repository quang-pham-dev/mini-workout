import { z } from 'zod';

export const onboardingStatusSchema = z.enum([
  'NOT_STARTED',
  'IN_PROGRESS',
  'REQUIRED_COMPLETED',
  'COMPLETED',
]);

export type OnboardingStatus = z.infer<typeof onboardingStatusSchema>;

export const onboardingStepSchema = z.enum([
  'EXPERIENCE_LEVEL',
  'INTERESTS',
  'WEEKLY_SCHEDULE',
  'FITNESS_GOALS',
  'DONE',
]);

export type OnboardingStep = z.infer<typeof onboardingStepSchema>;

export function isReadyForApp(
  status: OnboardingStatus | null | undefined,
): boolean {
  return status === 'REQUIRED_COMPLETED' || status === 'COMPLETED';
}

export function appendUniqueStep(
  steps: string[] | null | undefined,
  step: OnboardingStep,
): string[] {
  const current = steps ?? [];
  return current.includes(step) ? current : [...current, step];
}
