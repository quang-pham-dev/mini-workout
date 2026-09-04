import {
  assertTestDatabase,
  configureUser,
  prepareDatabase,
  testUsers,
} from './fixtures/database';
import { request } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const baseURL = 'http://localhost:3000';

export default async function globalSetup() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      'E2E setup requires DATABASE_URL to be explicitly set to a disposable test database',
    );
  }

  assertTestDatabase(databaseUrl);
  execFileSync(
    'pnpm',
    ['--filter', '@mini-workout/web', 'exec', 'prisma', 'migrate', 'deploy'],
    {
      stdio: 'inherit',
    },
  );
  execFileSync('pnpm', ['--filter', '@mini-workout/web', 'db:seed'], {
    stdio: 'inherit',
  });
  await prepareDatabase(databaseUrl);

  mkdirSync('e2e/.auth', { recursive: true });
  const api = await request.newContext({ baseURL });

  try {
    for (const [name, user] of Object.entries(testUsers)) {
      const response = await api.post('/api/auth/sign-up/email', {
        data: { name: `${name} user`, ...user },
      });
      if (!response.ok()) {
        throw new Error(
          `E2E setup could not register ${user.email}: ${response.status()}`,
        );
      }

      const configuration = {
        active: {
          onboardingCompleted: true,
          interestSlugs: ['strength', 'hiit'],
          favoriteWorkoutSlugs: ['the-20-minute-reset'],
          likeWorkoutSlugs: ['the-20-minute-reset'],
        },
        empty: { onboardingCompleted: true },
        newUser: { onboardingCompleted: false },
        long: { onboardingCompleted: true, interestSlugs: ['mobility'] },
      }[name as keyof typeof testUsers];
      await configureUser(databaseUrl, user.email, configuration);

      const signIn = await api.post('/api/auth/sign-in/email', {
        data: { email: user.email, password: user.password, rememberMe: true },
      });
      if (!signIn.ok()) {
        throw new Error(
          `E2E setup could not sign in ${user.email}: ${signIn.status()}`,
        );
      }
      await api.storageState({
        path: `e2e/.auth/${name === 'newUser' ? 'new-user' : name}.json`,
      });
    }
  } finally {
    await api.dispose();
  }
}
