# Storybook Architecture

Storybook is the visual and accessibility review surface for `@mini-workout/ui`.
It is not a production application and must not contain product data access or
business workflows.

## Conventions

- Keep stories beside the component they describe.
- Cover default, variant, disabled, loading, error, and responsive states when
  those states exist.
- Use the a11y addon for every interactive component.
- Prefer deterministic fixtures and avoid network calls in stories.
- Import shared UI styles once in the Storybook preview.

## Testing role

Storybook validates visual states and accessibility expectations. It does not
replace unit tests for logic or Playwright tests for product journeys.
