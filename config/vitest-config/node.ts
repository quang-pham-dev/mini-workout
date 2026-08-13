import { defineConfig, mergeConfig } from 'vitest/config';
import { baseConfig } from './index.ts';

export const nodeConfig = defineConfig(
  mergeConfig(baseConfig, {
    test: {
      environment: 'node',
    },
  }),
);
