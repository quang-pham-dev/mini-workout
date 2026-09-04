import {
  assertTestDatabase,
  configureUser,
  prepareDatabase,
  testUsers,
} from './fixtures/database';
import { test } from '@playwright/test';
import { request } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const baseURL = 'http://localhost:3000';
const authDirectory = fileURLToPath(new URL('./.auth', import.meta.url));

test('prepare deterministic database fixtures', async () => {
  const databaseUrl = process.env.E2E_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      'E2E setup requires E2E_DATABASE_URL or DATABASE_URL to be set to an approved disposable database',
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

  mkdirSync(authDirectory, { recursive: true });
  const api = await request.newContext({ baseURL });
  let setupSucceeded = false;

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
        path: fileURLToPath(
          new URL(
            `.auth/${name === 'newUser' ? 'new-user' : name}.json`,
            import.meta.url,
          ),
        ),
      });
    }
    setupSucceeded = true;
  } finally {
    await api.dispose();
    if (!setupSucceeded) {
      rmSync(authDirectory, { recursive: true, force: true });
    }
  }
});
