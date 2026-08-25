import { nodeConfig } from '@mini-workout/vitest-config/node';
import { fileURLToPath } from 'node:url';
import { defineConfig, mergeConfig } from 'vitest/config';

export default mergeConfig(
  nodeConfig,
  defineConfig({
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    test: {
      include: ['tests/**/*.{test,spec}.{ts,tsx}'],
      coverage: {
        // Only measure coverage for pure logic files that can be unit-tested
        // without mocking the Next.js runtime, Prisma, or auth sessions.
        // Server actions, React pages, and the Prisma singleton rely on
        // Next.js internals (headers, redirect, cache) and require integration
        // or e2e tests — they are out of scope for unit coverage thresholds.
        include: [
          'src/features/*/schema.ts',
          'src/features/*/presentation.ts',
          'src/lib/auth/authorization.ts',
          'src/lib/auth/validation.ts',
        ],
      },
    },
  }),
);
