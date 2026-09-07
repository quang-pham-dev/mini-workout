import { defineConfig } from '@playwright/test';

export default defineConfig({
  globalSetup: './global-setup.ts',
  retries: 0,
  workers: 1,
  reporter: 'line',
  outputDir: `${process.env.CONTRACT_ROOT}/results`,
  projects: [
    { name: 'public', testMatch: 'public.spec.ts' },
    { name: 'db-setup', testMatch: 'setup.spec.ts' },
    { name: 'db', testMatch: 'consumer.spec.ts', dependencies: ['db-setup'] },
  ],
});
