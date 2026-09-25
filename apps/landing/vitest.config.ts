import { nodeConfig } from '@mini-workout/vitest-config/node';
import { defineConfig, mergeConfig } from 'vitest/config';

export default mergeConfig(
  nodeConfig,
  defineConfig({
    test: {
      include: ['tests/**/*.{test,spec}.{ts,tsx}'],
      coverage: {
        include: [
          'src/content/**/*.ts',
          'src/lib/env.ts',
          'src/lib/seo/**/*.ts',
        ],
      },
    },
  }),
);
