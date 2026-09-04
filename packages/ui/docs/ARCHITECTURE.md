# UI Package Architecture

`@mini-workout/ui` is the compiled web renderer for the shared design system.
It owns DOM elements, Radix web primitives, Tailwind class composition, and
browser accessibility behavior.

## Boundaries

- Components must be platform-specific web implementations.
- Use `@mini-workout/design-system` contracts for shared names, variants, and
  accessibility expectations.
- Do not import application code, data clients, or business rules.
- Do not import another package's source path; use public exports.
- Keep heavy or feature-specific components behind explicit subpath exports.

The DataTable is intentionally available from `@mini-workout/ui/data-table`
instead of the main barrel so simple consumers do not pay for table behavior.

## Component conventions

- Prefer composition and compound components for related UI pieces.
- Forward refs where the underlying DOM element is part of the public API.
- Use semantic HTML before ARIA attributes.
- Preserve keyboard, focus, disabled, invalid, and expanded states.
- Add a Storybook story for visual states and focused tests for non-trivial
  behavior.

## Styling

Components use semantic design-system utilities. Avoid raw brand colors and
one-off spacing values when a semantic token exists. Global styles are imported
by the consuming web application once. This package must not export or import a
global design-system stylesheet.

## Build and API

The package is compiled with tsup. A public entrypoint must be added to both
`tsup.config.ts` and `package.json` exports, then verified with type-check,
lint, tests, and a consumer build.
