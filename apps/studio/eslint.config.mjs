import { config } from '@mini-workout/eslint-config/reactjs-library';

export default [
  { ignores: ['.sanity/**', 'coverage/**', 'dist/**'] },
  ...config,
];
