import { config } from '@mini-workout/eslint-config/reactjs-library';

export default [
  ...config,
  { ignores: ['.output/**', 'coverage/**', 'src/routeTree.gen.ts'] },
];
