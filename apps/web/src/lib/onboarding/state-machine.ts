import type {
  OnboardingStatus,
  OnboardingStep,
} from '@mini-workout/core/onboarding';

export { appendUniqueStep, isReadyForApp } from '@mini-workout/core/onboarding';
export type {
  OnboardingStatus,
  OnboardingStep,
} from '@mini-workout/core/onboarding';

export type OnboardingCookieValue =
  'in_progress' | 'required_done' | 'completed';

export function getOnboardingCookieValue(
  status: OnboardingStatus | null | undefined,
): OnboardingCookieValue {
  if (status === 'COMPLETED') return 'completed';
  if (status === 'REQUIRED_COMPLETED') return 'required_done';
  return 'in_progress';
}

export function getRedirectStepParam(step: OnboardingStep | null | undefined) {
  return step ?? 'EXPERIENCE_LEVEL';
}

export function normalizeStepParam(
  step: string | string[] | undefined,
): OnboardingStep | null {
  const value = Array.isArray(step) ? step[0] : step;
  if (
    value === 'EXPERIENCE_LEVEL' ||
    value === 'INTERESTS' ||
    value === 'WEEKLY_SCHEDULE' ||
    value === 'FITNESS_GOALS' ||
    value === 'DONE'
  ) {
    return value;
  }
  return null;
}
