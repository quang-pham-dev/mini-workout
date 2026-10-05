# `@mini-workout/vitest-config`

Shared Vitest configuration for Node and React/jsdom tests.

## Available exports

- `@mini-workout/vitest-config` — base configuration and coverage thresholds.
- `@mini-workout/vitest-config/react` — React/jsdom configuration.
- `@mini-workout/vitest-config/node` — Node environment configuration.

The modules expose named configurations. Example:

```ts
import { reactConfig } from '@mini-workout/vitest-config/react';
import { defineConfig, mergeConfig } from 'vitest/config';

export default mergeConfig(
  reactConfig,
  defineConfig({
    test: {
      include: ['tests/**/*.{test,spec}.{ts,tsx}'],
    },
  }),
);
```

The shared base config uses the V8 provider and an 80% threshold for lines,
functions, branches, and statements. A package may narrow coverage scope when
that is intentional and documented.

Run tests from the repository root or target a package directly:

```bash
pnpm test
pnpm --filter @mini-workout/ui test:coverage
```
