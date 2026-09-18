import { config } from '@mini-workout/eslint-config/reactjs-library';
import pluginBoundaries from 'eslint-plugin-boundaries';

export default [
  ...config,
  {
    ignores: ['.output/**', 'coverage/**', 'src/routeTree.gen.ts'],
  },
  {
    plugins: {
      boundaries: pluginBoundaries,
    },
    settings: {
      'boundaries/include': ['src/**/*.{ts,tsx}'],
      'import/resolver': {
        typescript: { project: './tsconfig.json' },
        node: true,
      },
      'boundaries/elements': [
        {
          type: 'routes',
          pattern: 'src/routes',
          partialMatch: false,
        },
        {
          type: 'features',
          pattern: 'src/features/*',
          partialMatch: false,
        },
        {
          type: 'components',
          pattern: 'src/components',
          partialMatch: false,
        },
        {
          type: 'libs',
          pattern: 'src/lib',
          partialMatch: false,
        },
      ],
    },
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@mini-workout/database',
              message:
                'Admin must access persistence through @mini-workout/core services.',
            },
          ],
        },
      ],
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          message:
            '{{from.element.types}} is not allowed to import from {{to.element.types}} — violating admin dependency direction.',
          policies: [
            {
              from: { element: { type: 'routes' } },
              allow: {
                dependency: {
                  relationship: { to: 'internal' },
                },
              },
            },
            {
              from: { element: { type: 'routes' } },
              allow: {
                to: {
                  element: {
                    type: ['components', 'libs'],
                  },
                },
              },
            },
            {
              from: { element: { type: 'routes' } },
              allow: {
                to: {
                  element: {
                    type: 'features',
                    fileInternalPath: 'index.ts',
                  },
                },
              },
              message:
                'Routes must import admin feature capabilities through features/*/index.ts.',
            },
            {
              from: { element: { type: 'features' } },
              allow: {
                dependency: {
                  relationship: { to: 'internal' },
                },
              },
            },
            {
              from: { element: { type: 'features' } },
              allow: {
                to: {
                  element: {
                    type: ['libs'],
                  },
                },
              },
            },
            {
              from: { element: { type: 'components' } },
              allow: {
                dependency: {
                  relationship: { to: 'internal' },
                },
              },
            },
            {
              from: { element: { type: 'components' } },
              allow: {
                to: {
                  element: {
                    type: ['components', 'libs'],
                  },
                },
              },
            },
            {
              from: { element: { type: 'libs' } },
              allow: {
                dependency: {
                  relationship: { to: 'internal' },
                },
              },
            },
            {
              from: { element: { type: 'libs' } },
              allow: {
                to: {
                  element: {
                    type: ['libs'],
                  },
                },
              },
            },
          ],
        },
      ],
    },
  },
];
