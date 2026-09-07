import { config } from '@mini-workout/eslint-config/base';

export default [
  {
    ignores: ['node_modules/**', 'playwright-report/**', 'test-results/**'],
  },
  ...config,
  {
    // These values are generated within the run, not inherited Turbo inputs.
    rules: {
      'turbo/no-undeclared-env-vars': [
        'warn',
        {
          allowList: [
            'E2E_COORDINATOR_URL',
            'E2E_COORDINATOR_SECRET',
            'E2E_RUN_TOKEN',
            'CONTRACT_ROOT',
            'CONTRACT_SETUP_FAIL',
            'CONTRACT_CLEANUP_FAIL',
          ],
        },
      ],
    },
  },
];
