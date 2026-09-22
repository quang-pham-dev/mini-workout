import { resolveDatabaseUrl } from './fixtures/database-env.ts';
import { emailCapturePath } from './fixtures/email-capture.ts';
import { defineConfig, devices } from '@playwright/test';

const defaultPublicPort = 3000;
const defaultDatabasePort = 3001;
const defaultAdminPort = 3002;
// Keep in sync with Chromium's generic restricted ports in net/base/port_util.cc.
const chromiumRestrictedPorts = new Set([
  0, 1, 7, 9, 11, 13, 15, 17, 19, 20, 21, 22, 23, 25, 37, 42, 43, 53, 69, 77,
  79, 87, 95, 101, 102, 103, 104, 109, 110, 111, 113, 115, 117, 119, 123, 135,
  137, 139, 143, 161, 179, 389, 427, 465, 512, 513, 514, 515, 526, 530, 531,
  532, 540, 548, 554, 556, 563, 587, 601, 636, 989, 990, 993, 995, 1719, 1720,
  1723, 2049, 3659, 4045, 5060, 5061, 6000, 6566, 6665, 6666, 6667, 6668, 6669,
  6697, 10080,
]);

function resolvePort(
  env: NodeJS.ProcessEnv,
  key: 'E2E_PUBLIC_PORT' | 'E2E_DATABASE_PORT' | 'E2E_ADMIN_PORT',
  fallback: number,
): number {
  const value = env[key];
  if (value === undefined) return fallback;
  if (!/^[1-9]\d*$/.test(value)) {
    throw new Error(`${key} must be an integer from 1024 through 65535.`);
  }
  const port = Number(value);
  if (!Number.isSafeInteger(port) || port < 1024 || port > 65535) {
    throw new Error(`${key} must be an integer from 1024 through 65535.`);
  }
  if (chromiumRestrictedPorts.has(port)) {
    throw new Error(`${key} port ${port} is a Chromium-restricted port.`);
  }
  return port;
}

export function resolveE2EPorts(env: NodeJS.ProcessEnv) {
  const ports = {
    admin: resolvePort(env, 'E2E_ADMIN_PORT', defaultAdminPort),
    database: resolvePort(env, 'E2E_DATABASE_PORT', defaultDatabasePort),
    public: resolvePort(env, 'E2E_PUBLIC_PORT', defaultPublicPort),
  };
  if (new Set(Object.values(ports)).size !== Object.keys(ports).length) {
    throw new Error('E2E public, database, and admin ports must be distinct.');
  }
  return ports;
}

const configuredPorts = resolveE2EPorts(process.env);
export const publicBaseURL = `http://localhost:${configuredPorts.public}`;
export const databaseBaseURL = `http://localhost:${configuredPorts.database}`;
export const adminBaseURL = `http://localhost:${configuredPorts.admin}`;
const mobileDevice = devices['Pixel 7'];
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
  const ports = resolveE2EPorts(env);
  const baseURL = `http://localhost:${ports.public}`;
  const safeEnvironment = Object.fromEntries(
    preservedEnvironmentKeys.flatMap((key) =>
      env[key] === undefined ? [] : [[key, env[key] as string]],
    ),
  );

  return {
    ...safeEnvironment,
    NODE_ENV: 'production',
    NEXT_TELEMETRY_DISABLED: '1',
    PORT: String(ports.public),
    BETTER_AUTH_URL: baseURL,
    BETTER_AUTH_SECRET: 'V7c9pQ2mL8xR4nK6sT1wY5zA3dF0hJ9uB2eG7iN4oP6',
    DATABASE_URL:
      'postgresql://invalid:invalid@127.0.0.1:1/mini_workout_public_test',
    E2E_DATABASE_URL: '',
    AUTH_FEATURE_FLAG_PROVIDER: 'local',
    MW_FEATURE_AUTH_EMAIL_VERIFICATION: '0',
  };
}

export function databaseServerEnv(
  env: NodeJS.ProcessEnv,
  databaseUrl: string,
): Record<string, string> {
  const ports = resolveE2EPorts(env);
  const baseURL = `http://localhost:${ports.database}`;
  const validatedDatabaseUrl = resolveDatabaseUrl({
    DATABASE_URL: databaseUrl,
    E2E_DATABASE_URL: databaseUrl,
  });

  return {
    ...publicServerEnv(env),
    PORT: String(ports.database),
    BETTER_AUTH_URL: baseURL,
    DATABASE_URL: validatedDatabaseUrl,
    E2E_DATABASE_URL: validatedDatabaseUrl,
    E2E_AUTH_RATE_LIMIT_DISABLED: '1',
    AUTH_EMAIL_PROVIDER: 'fake',
    AUTH_EMAIL_CAPTURE_FILE: emailCapturePath(validatedDatabaseUrl),
    AUTH_EMAIL_CAPTURE_RESET: '1',
  };
}

export function adminServerEnv(
  env: NodeJS.ProcessEnv,
  databaseUrl: string,
): Record<string, string> {
  const ports = resolveE2EPorts(env);
  const validatedDatabaseUrl = resolveDatabaseUrl({
    DATABASE_URL: databaseUrl,
    E2E_DATABASE_URL: databaseUrl,
  });
  return {
    ...publicServerEnv(env),
    PORT: String(ports.admin),
    BETTER_AUTH_URL: `http://localhost:${ports.admin}`,
    BETTER_AUTH_TRUSTED_ORIGINS: [
      `http://localhost:${ports.admin}`,
      `http://localhost:${ports.database}`,
    ].join(','),
    DATABASE_URL: validatedDatabaseUrl,
    E2E_DATABASE_URL: validatedDatabaseUrl,
    E2E_AUTH_RATE_LIMIT_DISABLED: '1',
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

export function adminServerCommand(env: Record<string, string>): string {
  return serverCommand(env).replace(
    '@mini-workout/web start',
    '@mini-workout/admin start',
  );
}

export function projectDefinitions(env: NodeJS.ProcessEnv) {
  const ports = resolveE2EPorts(env);
  const selectedPublicBaseURL = `http://localhost:${ports.public}`;
  const selectedDatabaseBaseURL = `http://localhost:${ports.database}`;
  const selectedAdminBaseURL = `http://localhost:${ports.admin}`;
  const hasDatabaseEnvironment =
    Boolean(env.E2E_DATABASE_URL) && Boolean(env.DATABASE_URL);
  return [
    {
      name: 'public',
      testMatch: /tests\/public\/(?!theme-mobile\.spec\.ts$).*\.spec\.ts$/,
      use: { baseURL: selectedPublicBaseURL },
    },
    {
      name: 'public-mobile',
      testMatch: /tests\/public\/theme-mobile\.spec\.ts$/,
      use: { ...mobileDevice, baseURL: selectedPublicBaseURL },
    },
    ...(hasDatabaseEnvironment
      ? [
          {
            name: 'db-setup',
            retries: 0,
            testMatch: /global\.setup\.ts/,
            use: { baseURL: selectedDatabaseBaseURL, trace: 'off' as const },
          },
          {
            name: 'db',
            dependencies: ['db-setup'],
            testMatch:
              /tests\/db\/(?!navigation-mobile\.spec\.ts$).*\.spec\.ts$/,
            // Auth request bodies and session cookies must not enter trace artifacts.
            use: { baseURL: selectedDatabaseBaseURL, trace: 'off' as const },
          },
          {
            name: 'db-mobile',
            dependencies: ['db-setup'],
            testMatch: /tests\/db\/navigation-mobile\.spec\.ts$/,
            // Auth request bodies and session cookies must not enter trace artifacts.
            use: {
              ...mobileDevice,
              baseURL: selectedDatabaseBaseURL,
              trace: 'off' as const,
            },
          },
          {
            name: 'admin',
            dependencies: ['db-setup'],
            testMatch:
              /tests\/admin\/(?!accessibility-responsive\.spec\.ts$).*\.spec\.ts$/,
            use: { baseURL: selectedAdminBaseURL, trace: 'off' as const },
          },
          {
            name: 'admin-mobile',
            dependencies: ['db-setup'],
            testMatch: /tests\/admin\/accessibility-responsive\.spec\.ts$/,
            use: {
              ...mobileDevice,
              baseURL: selectedAdminBaseURL,
              trace: 'off' as const,
            },
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
  globalSetup: './coordinator.setup.ts',
  testDir: '.',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ['list'],
    [
      'html',
      {
        outputFolder:
          process.env.PLAYWRIGHT_HTML_OUTPUT_DIR ?? 'playwright-report',
        open: 'never',
      },
    ],
  ],
  snapshotPathTemplate:
    '{testDir}/__screenshots__/{platform}/{projectName}/{testFilePath}/{arg}{ext}',
  updateSnapshots: process.env.CI ? 'none' : 'missing',
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
          url: `${publicBaseURL}/api/health/live`,
          env: publicServerEnv(process.env),
        },
        {
          command: serverCommand(databaseServerEnv(process.env, databaseUrl)),
          reuseExistingServer: false,
          timeout: 120_000,
          url: `${databaseBaseURL}/api/health`,
          env: databaseServerEnv(process.env, databaseUrl),
        },
        {
          command: adminServerCommand(adminServerEnv(process.env, databaseUrl)),
          reuseExistingServer: false,
          timeout: 120_000,
          url: `${adminBaseURL}/login`,
          env: adminServerEnv(process.env, databaseUrl),
        },
      ]
    : {
        command: serverCommand(publicServerEnv(process.env)),
        reuseExistingServer: false,
        timeout: 120_000,
        url: `${publicBaseURL}/api/health/live`,
        env: publicServerEnv(process.env),
      },
  projects: projectDefinitions(process.env),
});
