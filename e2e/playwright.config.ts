import { defineConfig, devices } from '@playwright/test';

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
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    url: 'http://localhost:3000/api/health',
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
