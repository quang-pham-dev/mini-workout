import {
  appendUniqueStep,
  isReadyForApp,
  onboardingStatusSchema,
  onboardingStepSchema,
} from '../../src/onboarding';
import { describe, expect, it } from 'vitest';

describe('onboarding state machine', () => {
  it('owns the persisted onboarding contracts', () => {
    expect(onboardingStatusSchema.parse('REQUIRED_COMPLETED')).toBe(
      'REQUIRED_COMPLETED',
    );
    expect(onboardingStepSchema.parse('INTERESTS')).toBe('INTERESTS');
  });

  it('allows the app after required onboarding is complete', () => {
    expect(isReadyForApp('REQUIRED_COMPLETED')).toBe(true);
    expect(isReadyForApp('COMPLETED')).toBe(true);
    expect(isReadyForApp('IN_PROGRESS')).toBe(false);
  });

  it('appends a completed step only once', () => {
    expect(appendUniqueStep(['EXPERIENCE_LEVEL'], 'INTERESTS')).toEqual([
      'EXPERIENCE_LEVEL',
      'INTERESTS',
    ]);
    expect(appendUniqueStep(['INTERESTS'], 'INTERESTS')).toEqual(['INTERESTS']);
  });
});
