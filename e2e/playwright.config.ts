import { resolveDatabaseUrl } from './fixtures/database-env.ts';
import { defineConfig, devices } from '@playwright/test';

const baseURL = 'http://localhost:3000';
const preservedEnvironmentKeys = [
  'CI',
  'HOME',
  'LANG',
  'LC_ALL',
  'PATH',
  'PNPM_HOME',
  'TMPDIR',
];

export function publicServerEnv(
  env: NodeJS.ProcessEnv,
): Record<string, string> {
  return {
    ...Object.fromEntries(
      preservedEnvironmentKeys.flatMap((key) =>
        env[key] === undefined ? [] : [[key, env[key]]],
      ),
    ),
    NODE_ENV: 'development',
    NEXT_TELEMETRY_DISABLED: '1',
    BETTER_AUTH_URL: baseURL,
    BETTER_AUTH_SECRET: 'e2e-public-only-secret',
    DATABASE_URL: 'postgresql://127.0.0.1:1/public_only_blocked',
    E2E_DATABASE_URL: '',
  };
}

export function projectDefinitions(env: NodeJS.ProcessEnv) {
  const hasDatabaseEnvironment =
    Boolean(env.E2E_DATABASE_URL) && Boolean(env.DATABASE_URL);
  return [
    { name: 'public', testMatch: /tests\/infrastructure\.spec\.ts/ },
    ...(hasDatabaseEnvironment
      ? [
          { name: 'db-setup', testMatch: /global\.setup\.ts/ },
          {
            name: 'db',
            dependencies: ['db-setup'],
            testMatch: /tests\/fixtures\.spec\.ts/,
          },
        ]
      : []),
  ];
}

const hasDatabaseEnvironment =
  Boolean(process.env.E2E_DATABASE_URL) && Boolean(process.env.DATABASE_URL);
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
    baseURL,
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
          ...publicServerEnv(process.env),
          DATABASE_URL: databaseUrl,
          E2E_DATABASE_URL: databaseUrl,
        }
      : publicServerEnv(process.env),
  },
  projects: projectDefinitions(process.env),
});
