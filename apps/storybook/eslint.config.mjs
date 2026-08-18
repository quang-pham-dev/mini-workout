import { storybookConfig } from '@mini-workout/eslint-config/storybook';
import { defineConfig } from 'eslint/config';

export default defineConfig([
  ...storybookConfig,
  {
    ignores: ['dist/**'],
  },
]);
