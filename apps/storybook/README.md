# Storybook workspace

The Storybook workspace provides a visual development and review environment
for the shared components in `packages/ui`.

## Commands

```bash
pnpm --filter @mini-workout/storybook dev
pnpm --filter @mini-workout/storybook lint
pnpm --filter @mini-workout/storybook check-types
pnpm --filter @mini-workout/storybook build
pnpm --filter @mini-workout/storybook preview
```

The development server runs on <http://localhost:6006>.

## Stories

Stories are colocated with their components under
`packages/ui/src/components/<component>/`. Add stories for meaningful visual
states, accessibility states, and interaction states.

The workspace uses Storybook 10, Vite, React, the shared design system, and the
shared ESLint/TypeScript/Prettier configurations.
