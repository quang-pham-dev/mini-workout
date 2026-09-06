import { resolveDatabaseUrl } from './fixtures/database-env.ts';
import { defineConfig, devices } from '@playwright/test';

export const publicBaseURL = 'http://localhost:3000';
export const databaseBaseURL = 'http://localhost:3001';
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
  const safeEnvironment = Object.fromEntries(
    preservedEnvironmentKeys.flatMap((key) =>
      env[key] === undefined ? [] : [[key, env[key] as string]],
    ),
  );

  return {
    ...safeEnvironment,
    NODE_ENV: 'production',
    NEXT_TELEMETRY_DISABLED: '1',
    PORT: '3000',
    BETTER_AUTH_URL: publicBaseURL,
    BETTER_AUTH_SECRET: 'e2e-public-only-secret',
  };
}

export function databaseServerEnv(
  env: NodeJS.ProcessEnv,
  databaseUrl: string,
): Record<string, string> {
  return {
    ...publicServerEnv(env),
    PORT: '3001',
    BETTER_AUTH_URL: databaseBaseURL,
    DATABASE_URL: databaseUrl,
    E2E_DATABASE_URL: databaseUrl,
  };
}

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

export function serverCommand(env: Record<string, string>): string {
  for (const key of Object.keys(env)) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
      throw new Error(`Unsafe server environment key: ${key}`);
    }
  }
  return [
    'env -i',
    ...Object.entries(env).map(([key, value]) => `${key}=${shellQuote(value)}`),
    'pnpm --filter @mini-workout/web start',
  ].join(' ');
}

export function projectDefinitions(env: NodeJS.ProcessEnv) {
  const hasDatabaseEnvironment =
    Boolean(env.E2E_DATABASE_URL) && Boolean(env.DATABASE_URL);
  return [
    {
      name: 'public',
      testMatch: /tests\/(infrastructure|theme)\.spec\.ts/,
      use: { baseURL: publicBaseURL },
    },
    ...(hasDatabaseEnvironment
      ? [
          {
            name: 'db-setup',
            testMatch: /global\.setup\.ts/,
            use: { baseURL: databaseBaseURL },
          },
          {
            name: 'db',
            dependencies: ['db-setup'],
            testMatch: /tests\/fixtures\.spec\.ts/,
            use: { baseURL: databaseBaseURL },
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
    baseURL: publicBaseURL,
    colorScheme: 'light',
    locale: 'en-US',
    screenshot: 'only-on-failure',
    timezoneId: 'UTC',
    trace: 'retain-on-failure',
  },
  webServer: databaseUrl
    ? [
        {
          command: serverCommand(publicServerEnv(process.env)),
          reuseExistingServer: false,
          timeout: 120_000,
          url: `${publicBaseURL}/api/health`,
          env: publicServerEnv(process.env),
        },
        {
          command: serverCommand(databaseServerEnv(process.env, databaseUrl)),
          reuseExistingServer: false,
          timeout: 120_000,
          url: `${databaseBaseURL}/api/health`,
          env: databaseServerEnv(process.env, databaseUrl),
        },
      ]
    : {
        command: serverCommand(publicServerEnv(process.env)),
        reuseExistingServer: false,
        timeout: 120_000,
        url: `${publicBaseURL}/api/health`,
        env: publicServerEnv(process.env),
      },
  projects: projectDefinitions(process.env),
});
