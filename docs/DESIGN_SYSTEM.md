# Mini Workout Design System

## Ownership

`packages/design-system` owns tokens, themes, Tailwind registration, reset,
shared utilities, and reusable motion. `packages/ui` owns web React renderers,
variants, and accessibility behavior. Each app owns one global CSS entrypoint,
font loading, route composition, and content-specific breakpoints.

## Public Entry Points

- [`@mini-workout/design-system/globals`](../packages/design-system/globals.css) is the app CSS foundation.
- [`@mini-workout/design-system/tokens`](../packages/design-system/src/tokens.ts) exposes platform-neutral token names.
- [`@mini-workout/design-system/contracts`](../packages/design-system/src/contracts.ts) exposes component contracts.
- [`@mini-workout/ui`](../packages/ui/README.md) exposes shared React components.
- [Storybook](../apps/storybook) is the visual component inventory.

## CSS Import Order

An app imports `@mini-workout/design-system/globals` once, then declares its
workspace `@source` paths and app-only rules. The foundation imports Tailwind,
primitive tokens, Light and Dark themes, and shared utilities. `packages/ui`
must not import global CSS on behalf of consumers.

## Token Categories

Tokens are grouped into primitives, product semantics, compatibility aliases,
spacing, radius, typography, effects, motion, and shared breakpoints.

## Compatibility Aliases

Compatibility roles such as `card`, `muted`, `secondary`, `input`, and `ring`
use `--color-*` Tailwind names registered from theme variables such as `--card`
and `--ring`. They are explicit aliases, not a second product palette.

## Theme Behavior

Light is the default. Dark values use the `.dark` selector. System preference
resolution is provided by the web app theme infrastructure; both themes must
retain identical semantic role coverage.

## Typography

The design system defines sans, display, mono, and semantic type utilities.
Current app font fallback behavior is a known parity-preserving exception: the
web app loads Geist but has not remapped every design-system role to it.

## Responsive Conventions

Shared breakpoints remain available, but the app-specific 480/600/640/680/760/
768/900px boundaries are content breakpoints. They are not additions to the
global token scale and should remain local arbitrary variants where required.

## Motion

Reusable accordion, shimmer, and mobile-menu animations live in the foundation.
The foundation reduces animation and transition duration for users who prefer
reduced motion; Accordion also opts out of its utility animations explicitly.

## Component Conventions

Use semantic tokens, composition, accessible HTML, and typed variant contracts.
Add behavior-focused tests and stories for meaningful visual states.

## Storybook Requirements

Storybook imports `src/storybook.css`, its sole design-system CSS entrypoint.
Shared components should document default, interactive, disabled, invalid, and
theme-relevant states when applicable.

## Changing a Token

Update the TypeScript vocabulary, both theme role sets, and `@theme` registration
when applicable. Run design-system tests, foundation checks, format, and builds.

## Changing a Component

Update the UI component and its story or focused test. Verify the UI build and
Storybook build before changing consumer CSS.

## Validation Commands

```bash
pnpm --filter @mini-workout/design-system test
pnpm --filter @mini-workout/design-system check-foundation
pnpm --filter @mini-workout/ui build
pnpm --filter @mini-workout/storybook build
pnpm --filter @mini-workout/web build
pnpm docs:check
```

## Known Legacy Exceptions

The `theme-ocean`, `theme-forest`, and `theme-sunset` variants are selector-only
Tailwind variants. They remain available for consumers that define their own
`[data-theme]` palettes; this package does not ship palette values for them.

Product page CSS Modules remain during the staged migration. The current Geist
font loading and fallback mapping is intentionally preserved for visual parity.
The drift check excludes those staged modules until their separately reviewed
token corrections are applied.
