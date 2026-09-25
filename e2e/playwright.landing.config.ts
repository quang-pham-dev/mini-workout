import { defineConfig, devices } from '@playwright/test';

const portInput = process.env.E2E_LANDING_PORT ?? '4173';
if (!/^[1-9]\d*$/.test(portInput)) {
  throw new Error(
    'E2E_LANDING_PORT must be an integer from 1024 through 65535.',
  );
}
const port = Number(portInput);
if (!Number.isSafeInteger(port) || port < 1024 || port > 65535) {
  throw new Error(
    'E2E_LANDING_PORT must be an integer from 1024 through 65535.',
  );
}
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './tests/landing',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ['list'],
    [
      'html',
      {
        outputFolder:
          process.env.PLAYWRIGHT_HTML_OUTPUT_DIR ?? 'playwright-report/landing',
        open: 'never',
      },
    ],
  ],
  outputDir: process.env.PLAYWRIGHT_OUTPUT_DIR ?? 'test-results/landing',
  use: {
    baseURL,
    colorScheme: 'light',
    locale: 'en-US',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'landing',
      testMatch: /.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      name: 'landing-mobile',
      testMatch: /.*\.spec\.ts/,
      use: { ...devices['Pixel 7'] },
    },
  ],
  webServer: {
    command: `ASTRO_PREVIEW_BACKGROUND=0 pnpm --filter @mini-workout/landing exec astro preview --host 127.0.0.1 --port ${port}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
