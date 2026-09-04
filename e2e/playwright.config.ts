import { resolveDatabaseUrl } from './fixtures/database-env';
import { defineConfig, devices } from '@playwright/test';

const hasDatabaseEnvironment =
  Boolean(process.env.E2E_DATABASE_URL) || Boolean(process.env.DATABASE_URL);
const databaseUrl = hasDatabaseEnvironment
  ? resolveDatabaseUrl(process.env)
  : undefined;

export default defineConfig({
  globalTeardown: './global.teardown.ts',
  testDir: '.',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  snapshotPathTemplate: '{testDir}/__screenshots__/{testFilePath}/{arg}{ext}',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://localhost:3000',
    colorScheme: 'light',
    locale: 'en-US',
    screenshot: 'only-on-failure',
    timezoneId: 'UTC',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'pnpm --filter @mini-workout/web dev',
    reuseExistingServer: false,
    timeout: 120_000,
    url: 'http://localhost:3000/api/health',
    env: databaseUrl
      ? {
          ...Object.fromEntries(
            Object.entries(process.env).filter(
              (entry): entry is [string, string] => entry[1] !== undefined,
            ),
          ),
          DATABASE_URL: databaseUrl,
          E2E_DATABASE_URL: databaseUrl,
        }
      : undefined,
  },
  projects: [
    {
      name: 'public',
      testMatch: /tests\/infrastructure\.spec\.ts/,
    },
    {
      name: 'db-setup',
      testMatch: /global\.setup\.ts/,
    },
    {
      name: 'db',
      dependencies: ['db-setup'],
      testMatch: /tests\/fixtures\.spec\.ts/,
    },
  ],
});
