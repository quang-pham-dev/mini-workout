import { config } from '@mini-workout/eslint-config/base';

export default [
  ...config,
  {
    ignores: [
      'build/**',
      'dist/**',
      '.cache/**',
      '.strapi/**',
      '.tmp/**',
      'public/uploads/**',
      'types/generated/**',
    ],
  },
];
