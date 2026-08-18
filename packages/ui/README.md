# `@mini-workout/ui`

Shared compiled web React components for Mini Workout applications.

This package is intentionally web-specific. It owns DOM rendering, Radix web
primitives, Tailwind class composition, and browser accessibility behavior.
Shared names, variants, semantic tokens, and accessibility expectations live in
`@mini-workout/design-system` so a future native renderer can implement the
same contract without coupling React Native to web dependencies.

## Components

The current public component set includes:

- Accordion
- Badge
- Button
- Card
- Input
- Label
- Pagination
- Table and DataTable

Components are implemented under `src/components` and exported from
`src/index.ts`.

## Installation and usage

Inside another workspace, declare:

```json
{
  "dependencies": {
    "@mini-workout/ui": "workspace:*"
  }
}
```

Import the main entrypoint or a documented subpath:

```tsx
import { Button } from '@mini-workout/ui';
import { Button as ButtonEntry } from '@mini-workout/ui/button';
```

Import shared styles once in the consuming web application:

```css
@import '@mini-workout/ui/styles.css';
```

## Development

```bash
pnpm --filter @mini-workout/ui dev
pnpm --filter @mini-workout/ui build
pnpm --filter @mini-workout/ui lint
pnpm --filter @mini-workout/ui check-types
pnpm --filter @mini-workout/ui test
pnpm --filter @mini-workout/ui test:coverage
```

The package is compiled by tsup into `dist/`. The build includes the main
entrypoint and the `button` subpath entrypoint.

## Adding a component

1. Create a directory under `src/components`.
2. Add the implementation and a local index export.
3. Export the component from `src/index.ts` when it is part of the public API.
4. Add a Storybook story for visual behavior.
5. Add tests for non-trivial behavior.
6. Update this README if the public API changes.

When adding or changing a shared component variant, update the corresponding
contract in `@mini-workout/design-system/contracts` and verify its accessibility
expectations in Storybook.
