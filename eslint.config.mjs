// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import { config } from '@mini-workout/eslint-config/base';
import { defineConfig } from 'eslint/config';

export default defineConfig([...config, {
  ignores: [
    '**/dist/**',
    '**/build/**',
    '**/node_modules/**',
    '**/.turbo/**',
    '**/coverage/**',
    '*.config.js',
    '*.config.mjs',
  ],
}, ...storybook.configs["flat/recommended"]]);
