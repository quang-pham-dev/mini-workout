---
name: storybook
description: >
  Guidance for Storybook 10 in the mini-workout monorepo. Covers when to write
  stories, story file conventions, addon-a11y usage with test: 'error', the
  design-system Storybook integration, and verification commands. Use whenever
  adding or modifying UI components in packages/ui, or when the task requires
  visual or accessibility evidence.
risk: low
source: project
date_added: "2026-09-20"
---

# Storybook (apps/storybook)

Mini Workout uses **Storybook 10** (Vite-based) as the visual component
inventory and accessibility audit tool. Stories live alongside components in
`packages/ui/src/components`. The `apps/storybook` workspace hosts the
Storybook config and build target.

---

## When to Write Stories

Write or update stories when:

- Adding a new component to `packages/ui`
- Adding new visual variants or states to an existing component
- The component has visual states that matter for review (loading, empty, error, disabled)
- An accessibility change is made (ARIA attributes, focus states, keyboard behavior)
- A design review or visual verification is requested

You do **not** need a story for:
- Internal utility functions or non-visual modules
- One-off page-level layouts that are not shared components

---

## Story file location

Stories live **beside** the component they cover:

```
packages/ui/src/components/
  Button/
    Button.tsx
    Button.stories.tsx   ← story file here
  WorkoutCard/
    WorkoutCard.tsx
    WorkoutCard.stories.tsx
```

Do not place stories inside `apps/storybook/`. The Storybook config reads
from the shared `packages/ui/src/components` path.

---

## Story format

```ts
// packages/ui/src/components/Button/Button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react'
import { Button } from './Button'

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof Button>

export const Default: Story = {
  args: {
    children: 'Click me',
    variant: 'default',
  },
}

export const Disabled: Story = {
  args: {
    children: 'Disabled',
    disabled: true,
  },
}

export const Loading: Story = {
  args: {
    children: 'Loading',
    isLoading: true,
  },
}
```

Guidelines:
- Use `tags: ['autodocs']` for auto-generated prop documentation
- Export named stories for each meaningful visual state
- Use `args` instead of hard-coded JSX to enable the Controls addon
- Story names should describe the state, not the implementation (e.g. `Disabled`, not `ButtonWithDisabledPropTrue`)

---

## Accessibility (addon-a11y)

Storybook is configured with `addon-a11y` using `test: 'error'`. This means
**accessibility violations fail the Storybook build in CI**. Do not suppress
a11y rules without an explicit reason.

Key requirements:
- Every interactive component must have an accessible label (button, input, link)
- Color contrast must meet WCAG 2.1 AA (enforced by addon-a11y)
- Focus indicators must be visible (enforced by design-system token `--ring`)
- `aria-*` attributes must be correct and not contradict visible state

When making an a11y exception, add a comment explaining why:
```ts
parameters: {
  a11y: {
    config: {
      rules: [
        {
          // Decorative icon button — aria-label is on the wrapping link
          id: 'button-name',
          enabled: false,
        },
      ],
    },
  },
},
```

---

## Design system tokens in stories

Use design-system tokens, not hardcoded values, in story decorators:

```ts
// Correct — use CSS custom property from design-system
decorators: [
  (Story) => (
    <div style={{ backgroundColor: 'var(--background)', padding: '2rem' }}>
      <Story />
    </div>
  ),
],
```

The `@mini-workout/design-system/globals` stylesheet is imported once by the
Storybook config. Do not import it again in individual stories.

---

## Verification commands

Run these when UI components are added or changed:

```bash
# Start Storybook dev server
pnpm --filter @mini-workout/storybook dev

# Build (catches a11y errors and broken imports)
pnpm --filter @mini-workout/storybook build

# Design system foundation checks (token parity, etc.)
pnpm --filter @mini-workout/design-system check-foundation
pnpm --filter @mini-workout/design-system test
```

> **Note:** The Storybook `addon-vitest` browser integration is intentionally
> disabled due to a Vite 8 + CommonJS browser dependency incompatibility. CI
> runs lint/static checks and the production build only — there is no Storybook
> runtime test runner.

---

## CI behavior

CI runs:
1. `pnpm --filter @mini-workout/storybook build` — validates stories compile and a11y passes
2. No snapshot or runtime tests in CI (see note above)

For visual review, run Storybook locally and include screenshots in the PR
description for UI changes.

---

## Limitations

- Do not use `addon-vitest` browser mode — it is not compatible with the current Vite 8 setup
- Do not import `apps/web` or `apps/admin` modules into stories; stories test `packages/ui` only
- Stories are not a substitute for Playwright E2E journeys; use both
