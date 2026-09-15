import { reactConfig } from '@mini-workout/vitest-config/react';
import { fileURLToPath } from 'node:url';
import { defineConfig, mergeConfig } from 'vitest/config';

export default mergeConfig(
  reactConfig,
  defineConfig({
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    test: {
      include: ['tests/**/*.{test,spec}.{ts,tsx}'],
      coverage: {
        include: [
          'src/features/admin/contracts.ts',
          'src/features/admin/load-page.ts',
          'src/features/admin/query-options.ts',
          'src/lib/auth-handler.ts',
          'src/lib/auth-policy.ts',
          'src/lib/redirect.ts',
          'src/lib/security.ts',
        ],
      },
    },
  }),
);
