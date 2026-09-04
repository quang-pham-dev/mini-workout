import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  globalSetup: './global.setup.ts',
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
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
});
