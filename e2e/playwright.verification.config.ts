import { resolveDatabaseUrl } from './fixtures/database-env.ts';
import {
  resolveE2EPorts,
  serverCommand,
  verificationServerEnv,
} from './playwright.config.ts';
import { defineConfig, devices } from '@playwright/test';

const databaseUrl = resolveDatabaseUrl(process.env);
const ports = resolveE2EPorts(process.env);
const serverEnv = verificationServerEnv(process.env, databaseUrl);
const baseURL = `http://localhost:${ports.database}`;

export default defineConfig({
  testDir: './tests/verification',
  outputDir: process.env.PLAYWRIGHT_OUTPUT_DIR ?? 'test-results',
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
