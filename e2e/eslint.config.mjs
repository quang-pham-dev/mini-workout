import { config } from '@mini-workout/eslint-config/base';

export default [
  {
    ignores: ['node_modules/**', 'playwright-report/**', 'test-results/**'],
  },
  ...config,
];
