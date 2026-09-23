import { config } from '@mini-workout/eslint-config/base';

export default [
  ...config,
  {
    files: ['src/**/*.ts', 'tests/**/*.ts', '*.config.mjs'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'react',
              message:
                'Landing remains Astro-native until a measured island is approved.',
            },
            {
              name: '@mini-workout/ui',
              message:
                'Astro ownership is local until the shared-UI spike is closed.',
            },
          ],
        },
      ],
    },
  },
];
