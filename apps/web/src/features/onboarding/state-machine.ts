export type OnboardingStatus =
  'NOT_STARTED' | 'IN_PROGRESS' | 'REQUIRED_COMPLETED' | 'COMPLETED';

export type OnboardingStep =
  | 'EXPERIENCE_LEVEL'
  | 'INTERESTS'
  | 'WEEKLY_SCHEDULE'
  | 'FITNESS_GOALS'
  | 'DONE';

export type OnboardingCookieValue =
  'in_progress' | 'required_done' | 'completed';

export function isReadyForApp(status: OnboardingStatus | null | undefined) {
  return status === 'REQUIRED_COMPLETED' || status === 'COMPLETED';
}

export function getOnboardingCookieValue(
  status: OnboardingStatus | null | undefined,
): OnboardingCookieValue {
  if (status === 'COMPLETED') return 'completed';
  if (status === 'REQUIRED_COMPLETED') return 'required_done';
  return 'in_progress';
}

export function appendUniqueStep(
  steps: string[] | null | undefined,
  step: OnboardingStep,
) {
  const current = steps ?? [];
  return current.includes(step) ? current : [...current, step];
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
