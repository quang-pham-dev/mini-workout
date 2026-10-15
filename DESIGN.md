# Product and Design Notes

The current repository is a UI and architecture foundation for Mini Workout.

## Current design sources

- Shared CSS tokens and themes live in `packages/design-system`.
- Reusable React components live in `packages/ui`.
- Component states and visual examples live in Storybook stories.
- The web application currently contains the starter landing page and shared
  button integration.

## Design change expectations

- Prefer semantic design tokens over raw color and spacing values.
- Keep light and dark theme tokens consistent.
- Add or update a Storybook story for reusable visual components.
- Verify keyboard interaction, focus states, labels, and contrast.
- Include screenshots for visual changes in pull requests.
