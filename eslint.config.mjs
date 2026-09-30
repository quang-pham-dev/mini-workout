// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import { config } from '@mini-workout/eslint-config/base';
import storybook from 'eslint-plugin-storybook';
import { defineConfig } from 'eslint/config';

export default defineConfig([
  ...config,
  {
    ignores: [
      '**/dist/**',
      '**/build/**',
      '**/node_modules/**',
      '**/.turbo/**',
      '**/.next-build/**',
      '**/coverage/**',
      '**/types/generated/**',
      '*.config.js',
      '*.config.mjs',
      '**/.agent/**',
      '**/.agents/**',
      '**/.claude/**',
      '**/.codex/**',
      '**/.cursor/**',
      '**/.opencode/**',
    ],
  },
  ...storybook.configs['flat/recommended'],
  {
    files: ['packages/core/src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@mini-workout/ui',
              message: 'Core must not depend on UI packages.',
            },
            {
              name: '@mini-workout/observability',
              message: 'Core must not own runtime observability concerns.',
            },
            {
              name: '@mini-workout/auth',
              message: 'Core must not depend on an application auth adapter.',
            },
            {
              name: 'react',
              message: 'Core must remain framework-agnostic.',
            },
            {
              name: 'next',
              message: 'Core must remain framework-agnostic.',
            },
            {
              name: '@tanstack/react-query',
              message:
                'Core must not depend on client data-fetching frameworks.',
            },
            {
              name: '@tanstack/react-router',
              message:
                'Core must not depend on application routing frameworks.',
            },
            {
              name: '@tanstack/react-start',
              message: 'Core must not depend on application frameworks.',
            },
          ],
        },
      ],
    },
  },
]);
