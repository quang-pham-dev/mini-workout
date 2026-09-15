import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/constants.ts',
    'src/authorization.ts',
    'src/tanstack-start.ts',
  ],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
});
