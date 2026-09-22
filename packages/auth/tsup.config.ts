import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/constants.ts',
    'src/authorization.ts',
    'src/tanstack-start.ts',
    'src/email.ts',
    'src/feature-flags.ts',
    'src/rate-limit.ts',
    'src/rate-limit-prisma.ts',
    'src/verification-policy.ts',
  ],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
});
