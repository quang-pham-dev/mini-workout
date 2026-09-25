import { nodeConfig } from '@mini-workout/vitest-config/node';
import { defineConfig, mergeConfig } from 'vitest/config';

export default mergeConfig(
  nodeConfig,
  defineConfig({
    test: {
      include: ['tests/**/*.test.ts'],
      coverage: { include: ['schemaTypes/validation.ts'] },
    },
  }),
);
