# `@mini-workout/eslint-config`

Shared ESLint flat configurations for applications and packages in the
monorepo.

## Available exports

- `@mini-workout/eslint-config/base`
- `@mini-workout/eslint-config/reactjs-library`
- `@mini-workout/eslint-config/nextjs-library`
- `@mini-workout/eslint-config/storybook`

The exports are named. Use the configuration that matches the workspace:

```js
import { nextJsConfig } from '@mini-workout/eslint-config/nextjs-library';

export default nextJsConfig;
```

```js
import { config as reactConfig } from '@mini-workout/eslint-config/reactjs-library';

export default reactConfig;
```

```js
import { config as baseConfig } from '@mini-workout/eslint-config/base';

export default baseConfig;
```

For Storybook:

```js
import { storybookConfig } from '@mini-workout/eslint-config/storybook';

export default storybookConfig;
```

Run lint from the repository root so Turborepo can schedule package tasks:

```bash
pnpm lint
pnpm lint:fix
```

Warnings are treated as failures by application and UI package scripts.
