import {
  appendUniqueStep,
  getOnboardingCookieValue,
  getRedirectStepParam,
  isReadyForApp,
} from '@/lib/onboarding/state-machine';
import { describe, expect, it } from 'vitest';

describe('onboarding state machine helpers', () => {
  it('only treats required-complete and complete statuses as app-ready', () => {
    expect(isReadyForApp('NOT_STARTED')).toBe(false);
    expect(isReadyForApp('IN_PROGRESS')).toBe(false);
    expect(isReadyForApp('REQUIRED_COMPLETED')).toBe(true);
    expect(isReadyForApp('COMPLETED')).toBe(true);
  });

  it('maps statuses to edge cookie values', () => {
    expect(getOnboardingCookieValue('NOT_STARTED')).toBe('in_progress');
    expect(getOnboardingCookieValue('IN_PROGRESS')).toBe('in_progress');
    expect(getOnboardingCookieValue('REQUIRED_COMPLETED')).toBe(
      'required_done',
    );
    expect(getOnboardingCookieValue('COMPLETED')).toBe('completed');
  });

  it('keeps completed step lists unique while preserving order', () => {
    expect(appendUniqueStep(['EXPERIENCE_LEVEL'], 'EXPERIENCE_LEVEL')).toEqual([
      'EXPERIENCE_LEVEL',
    ]);
    expect(appendUniqueStep(['EXPERIENCE_LEVEL'], 'INTERESTS')).toEqual([
      'EXPERIENCE_LEVEL',
      'INTERESTS',
    ]);
  });

  it('formats redirect step query parameters', () => {
    expect(getRedirectStepParam('INTERESTS')).toBe('INTERESTS');
    expect(getRedirectStepParam(null)).toBe('EXPERIENCE_LEVEL');
  });
});
