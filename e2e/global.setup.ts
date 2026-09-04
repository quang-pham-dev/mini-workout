import { resolveDatabaseUrl } from './fixtures/database-env.ts';
import {
  acquireDatabaseLock,
  databaseRunKey,
} from './fixtures/database-lock.ts';
import {
  configureUser,
  prepareDatabase,
  testUsers,
} from './fixtures/database.ts';
import { withFixtureSetup } from './fixtures/setup-lifecycle.ts';
import { request, test } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const baseURL = 'http://localhost:3000';

function writeJsonAtomically(path: string, value: unknown): void {
  const temporaryPath = `${path}.${process.pid}.tmp`;
  writeFileSync(temporaryPath, JSON.stringify(value), 'utf8');
  renameSync(temporaryPath, path);
}

test('prepare deterministic database fixtures', async () => {
  const databaseUrl = resolveDatabaseUrl(process.env);
  const lock = acquireDatabaseLock(databaseUrl);
  const key = databaseRunKey(databaseUrl);
  const authDirectory = fileURLToPath(
    new URL(`./.auth/${key}`, import.meta.url),
  );
  const metadataPath = fileURLToPath(
    new URL(`./.auth/${key}.json`, import.meta.url),
  );

  await withFixtureSetup(authDirectory, lock.release, async () => {
    mkdirSync(authDirectory, { recursive: true });
    writeJsonAtomically(metadataPath, { databaseUrl, token: lock.token, key });
    const childEnv = {
      ...process.env,
      DATABASE_URL: databaseUrl,
      E2E_DATABASE_URL: databaseUrl,
    };
    execFileSync(
      'pnpm',
      ['--filter', '@mini-workout/web', 'exec', 'prisma', 'migrate', 'deploy'],
      { env: childEnv, stdio: 'inherit' },
    );
    execFileSync('pnpm', ['--filter', '@mini-workout/web', 'db:seed'], {
      env: childEnv,
      stdio: 'inherit',
    });
    await prepareDatabase(databaseUrl);

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
          data: {
            email: user.email,
            password: user.password,
            rememberMe: true,
          },
        });
        if (!signIn.ok()) {
          throw new Error(
            `E2E setup could not sign in ${user.email}: ${signIn.status()}`,
          );
        }
        await api.storageState({
          path: fileURLToPath(
            new URL(
              `.auth/${key}/${name === 'newUser' ? 'new-user' : name}.json`,
              import.meta.url,
            ),
          ),
        });
      }
    } finally {
      await api.dispose();
    }
  });
});
