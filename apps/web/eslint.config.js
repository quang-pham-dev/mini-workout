import { nextJsConfig } from '@mini-workout/eslint-config/nextjs-library';
import pluginBoundaries from 'eslint-plugin-boundaries';

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...nextJsConfig,
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
          type: 'app',
          pattern: 'src/app',
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
          type: 'hooks',
          pattern: 'src/hooks',
          partialMatch: false,
        },
        {
          type: 'utils',
          pattern: 'src/utils',
          partialMatch: false,
        },
        {
          type: 'types',
          pattern: 'src/types',
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
                'Web may import @mini-workout/database only from the readiness health route.',
            },
          ],
        },
      ],
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',

          message:
            '{{from.element.types}} is not allowed to import from {{to.element.types}} — violating dependency direction.',

          policies: [
            /**
             * app
             *
             * app is the composition layer and may depend on all shared
             * lower-level layers.
             */
            {
              from: {
                element: {
                  type: 'app',
                },
              },

              allow: {
                to: {
                  element: {
                    type: ['components', 'hooks', 'utils', 'types', 'libs'],
                  },
                },
              },
            },

            /**
             * app -> features
             *
             * Features expose a public API through `index.ts`.
             *
             * This replaces the old `boundaries/entry-point` rule.
             */
            {
              from: {
                element: {
                  type: 'app',
                },
              },

              allow: {
                to: {
                  element: {
                    type: 'features',
                    fileInternalPath: '**/index.tsx',
                  },
                },
              },

              message:
                'Feature internals cannot be imported directly. Import the feature through its public API (index.ts).',
            },

            /**
             * features
             *
             * A feature can depend on shared lower-level layers.
             *
             * Notice that `features` is intentionally NOT included in
             * the allowed targets. This prevents feature-to-feature
             * dependencies.
             */
            {
              from: {
                element: {
                  type: 'features',
                },
              },

              allow: {
                dependency: {
                  relationship: { to: 'internal' },
                },
              },
            },
            {
              from: {
                element: {
                  type: 'features',
                },
              },

              allow: {
                to: {
                  element: {
                    type: ['components', 'hooks', 'utils', 'types', 'libs'],
                  },
                },
              },
            },

            /**
             * components
             *
             * Shared UI components can depend on themselves and
             * lower-level shared layers.
             */
            {
              from: {
                element: {
                  type: 'components',
                },
              },

              allow: {
                to: {
                  element: {
                    type: ['components', 'hooks', 'utils', 'types', 'libs'],
                  },
                },
              },
            },

            /**
             * hooks
             *
             * Hooks can depend on hooks and lower-level layers.
             */
            {
              from: {
                element: {
                  type: 'hooks',
                },
              },

              allow: {
                to: {
                  element: {
                    type: ['hooks', 'utils', 'types', 'libs'],
                  },
                },
              },
            },

            /**
             * utils
             *
             * Utils should stay pure and only depend on utils/types.
             */
            {
              from: {
                element: {
                  type: 'utils',
                },
              },

              allow: {
                to: {
                  element: {
                    type: ['utils', 'types'],
                  },
                },
              },
            },

            /**
             * libs
             *
             * Infrastructure/configuration code can depend on libs
             * and pure lower-level layers.
             */
            {
              from: {
                element: {
                  type: 'libs',
                },
              },

              allow: {
                to: {
                  element: {
                    type: ['libs', 'utils', 'types'],
                  },
                },
              },
            },

            /**
             * types
             *
             * Lowest-level layer.
             */
            {
              from: {
                element: {
                  type: 'types',
                },
              },

              allow: {
                to: {
                  element: {
                    type: 'types',
                  },
                },
              },
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/app/api/health/ready/route.ts'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
];
