import { resolveDatabaseUrl } from './fixtures/database-env.ts';
import {
  rateLimitServerEnv,
  resolveE2EPorts,
  serverCommand,
} from './playwright.config.ts';
import { defineConfig, devices } from '@playwright/test';

const databaseUrl = resolveDatabaseUrl(process.env);
const ports = resolveE2EPorts(process.env);
const serverEnv = rateLimitServerEnv(process.env, databaseUrl);
const baseURL = `http://localhost:${ports.database}`;

export default defineConfig({
  testDir: './tests/rate-limit',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
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
    command: serverCommand(serverEnv),
    reuseExistingServer: false,
    timeout: 120_000,
    url: `${baseURL}/api/health`,
    env: serverEnv,
  },
});
