import { prepareAuthState } from './auth-setup.ts';
import type { ConfigureUserInput } from './database.ts';
import { strict as assert } from 'node:assert';
import test from 'node:test';

const allowedExperienceLevels = new Set([
  'BEGINNER',
  'INTERMEDIATE',
  'ADVANCED',
]);

test('completed fixture users satisfy the onboarding contract', async () => {
  const configurations: Array<{
    email: string;
    input: ConfigureUserInput;
  }> = [];
  const api = {
    post: async () => ({ ok: () => true, status: () => 200 }),
    storageState: async () => undefined,
    dispose: async () => undefined,
  };

  await prepareAuthState(
    api,
    'postgresql://user:password@127.0.0.1:5432/mini_workout_e2e',
    '123e4567-e89b-12d3-a456-426614174000',
    async (_databaseUrl, email, input) => {
      configurations.push({ email, input });
    },
  );

  assert.deepEqual(configurations, [
    {
      email: 'active-user@example.test',
      input: {
        onboardingCompleted: true,
        experienceLevel: 'INTERMEDIATE',
        interestSlugs: ['strength', 'hiit'],
        favoriteWorkoutSlugs: ['the-20-minute-reset'],
        likeWorkoutSlugs: ['the-20-minute-reset'],
      },
    },
    {
      email: 'empty-user@example.test',
      input: {
        onboardingCompleted: true,
        experienceLevel: 'BEGINNER',
        interestSlugs: ['mobility'],
      },
    },
    {
      email: 'new-user@example.test',
      input: { onboardingCompleted: false },
    },
  ]);

  for (const { input } of configurations.filter(
    ({ input }) => input.onboardingCompleted,
  )) {
    assert.equal(
      allowedExperienceLevels.has(input.experienceLevel ?? ''),
      true,
    );
    assert.ok(input.interestSlugs && input.interestSlugs.length > 0);
  }
});
