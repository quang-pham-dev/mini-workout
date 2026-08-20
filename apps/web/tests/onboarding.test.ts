import { onboardingSchema } from '../features/onboarding/schema';
import { describe, expect, it } from 'vitest';

describe('onboardingSchema', () => {
  it('accepts a selected experience level and interests', () => {
    expect(
      onboardingSchema.parse({
        experienceLevel: 'INTERMEDIATE',
        interests: ['strength', 'mobility'],
      }),
    ).toEqual({
      experienceLevel: 'INTERMEDIATE',
      interests: ['strength', 'mobility'],
    });
  });

  it('rejects an empty interest selection', () => {
    const result = onboardingSchema.safeParse({
      experienceLevel: 'BEGINNER',
      interests: [],
    });

    expect(result.success).toBe(false);
  });

  it('rejects duplicate interests and unknown experience levels', () => {
    const result = onboardingSchema.safeParse({
      experienceLevel: 'EXPERT',
      interests: ['strength', 'strength'],
    });

    expect(result.success).toBe(false);
  });
});
