# `@mini-workout/design-system`

Shared semantic design tokens, component contracts, Tailwind CSS v4 web
adapters, themes, utilities, and PostCSS configuration for the Mini Workout
monorepo.

This package owns the styling foundation. Apps import `./globals` once; the UI
package only supplies React renderers and never imports global CSS.

## Package exports

- `@mini-workout/design-system` — global CSS entrypoint.
- `@mini-workout/design-system/globals` — global CSS entrypoint.
- `@mini-workout/design-system/design-tokens` — token definitions.
- `@mini-workout/design-system/theme-light` — light theme overrides.
- `@mini-workout/design-system/theme-dark` — dark theme overrides.
- `@mini-workout/design-system/postcss-config` — shared PostCSS config.
- `@mini-workout/design-system/tokens` — platform-neutral semantic token names
  and types.
- `@mini-workout/design-system/contracts` — shared component names, variants,
  and accessibility expectations.

See [`docs/DESIGN_SYSTEM.md`](../../docs/DESIGN_SYSTEM.md) for the monorepo
contract and [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for package
ownership and drift controls.

## Usage

Declare the workspace dependency in the consuming app or package:

```json
{
  "devDependencies": {
    "@mini-workout/design-system": "workspace:*"
  }
}
```

Import the global stylesheet once:

```css
@import '@mini-workout/design-system';
```

Use the shared PostCSS configuration when the application needs it:

```js
export { default } from '@mini-workout/design-system/postcss-config';
```

### Using semantic tokens in web UI

Use semantic Tailwind utilities in components instead of primitive values:

```tsx
export function WorkoutSummary() {
  return (
    <section className="bg-surface-raised text-fg-primary rounded-lg border border-default p-6">
      <p className="text-fg-secondary text-body-sm">Today's progress</p>
      <strong className="text-primary text-heading-md">3 workouts</strong>
    </section>
  );
}
```

The same semantic classes work in light and dark mode. The consuming app only
needs to toggle the `dark` class on the document root:

```ts
document.documentElement.classList.toggle('dark', isDarkMode);
```

Use `highlight` for warm, human moments such as encouragement, onboarding
progress, or a recommended focus. It is intentionally separate from `primary`,
which represents the main action and brand interaction:

```tsx
<span className="bg-highlight-soft text-highlight-foreground rounded-full px-3 py-1 text-sm">
  A good place to start
</span>
```

Do not use the highlight token as a generic replacement for brand actions or
create one-off feature colors. Add a semantic token only when the meaning is
reusable across product surfaces and provide light and dark theme values.

### Referencing the shared foundation from TypeScript

Use the token names and component contracts when building or reviewing a
platform implementation:

```ts
import { componentContracts } from '@mini-workout/design-system/contracts';
import { semanticTokens } from '@mini-workout/design-system/tokens';
import { getCssVariable } from '@mini-workout/design-system/tokens';

const primaryColor = getCssVariable(semanticTokens.color.primary);
const buttonVariants = componentContracts.button.variants;
```

The TypeScript foundation describes shared vocabulary and behavior. It does not
render components and must not introduce DOM, Tailwind, or React Native
dependencies.

## Architecture rules

- Treat this package as the design-system foundation, not a UI renderer.
- Keep semantic token names and component contracts platform-neutral.
- Keep platform-specific rendering in `@mini-workout/ui` for web. A future
  native package may implement the same foundation without changing product
  code contracts.
- Prefer semantic tokens over raw color and spacing values in web components.
- Update both light and dark themes when adding semantic tokens.
- Register compatibility aliases in `@theme inline` and both theme files.
- Pair every named `--animate-*` contract with a local keyframe.
- Keep Tailwind v4 `@theme`, `@utility`, and `@custom-variant` declarations at
  the appropriate top level.
- Use `@source` in application CSS when classes are consumed from workspace
  packages.
- Import global styles only once per application.

## Change rules

When changing the design system:

1. Add or update the semantic name in `src/tokens.ts` when the concept is
   shared across platforms.
2. Update the light and dark CSS values for web semantic tokens.
3. Update `src/contracts.ts` when adding a public component, variant, size, or
   accessibility expectation.
4. Implement rendering details in `@mini-workout/ui`; do not put DOM code in
   this package's TypeScript foundation.
5. Add or update Storybook coverage for visual and accessibility behavior.
6. Run the validation commands below.

Do not add a token for a one-off component value. Prefer an existing semantic
token or introduce a new token only when it represents a reusable design
decision.

## Validation

```bash
pnpm --filter @mini-workout/design-system format
pnpm --filter @mini-workout/design-system check-foundation
pnpm --filter @mini-workout/design-system build
pnpm --filter @mini-workout/design-system check-types
pnpm --filter @mini-workout/design-system lint
```

The CSS files are the web adapter. The small TypeScript foundation is compiled
so consumers can share token names and component contracts without importing
web-only CSS or DOM code.
