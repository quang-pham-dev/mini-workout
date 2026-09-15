import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/errors.ts',
    'src/workouts/index.ts',
    'src/users/index.ts',
    'src/onboarding/index.ts',
    'src/coaches/index.ts',
  ],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
});
