# Testing Guide

## Test layers

Testing is incremental and feature-owned. A feature is not considered complete
without the smallest useful tests at the relevant layers.

```text
unit                 pure functions, schemas, transformations
component            UI behavior, keyboard/focus, accessibility states
integration          data/service boundaries and error mapping
E2E                  critical user journeys in a production-like app
smoke                deployment health and essential route availability
```

### Unit and component tests

Unit tests currently live in the package they cover. The UI package uses
Vitest with the shared React/jsdom configuration:

```bash
pnpm --filter @mini-workout/ui test
pnpm --filter @mini-workout/ui test:coverage
```

Use behavior-focused names such as:

```text
renders the workout card title
disables the button when the disabled prop is set
```

### Storybook

Reusable UI components should have stories when their visual states matter:

```bash
pnpm --filter @mini-workout/storybook dev
pnpm --filter @mini-workout/storybook build
```

Stories live beside components under `packages/ui/src/components`.

### End-to-end tests

The `e2e/` directory is reserved for Playwright browser flows, but the project
does not currently contain a Playwright configuration or runnable E2E suite.
Do not document E2E commands as available until the runner and at least one
critical user journey are implemented.

When E2E work begins, prioritize user-visible flows such as:

- The web app loads successfully.
- A user can navigate the workout discovery flow.
- A user can view a workout detail page.
- Authentication and protected routes work once that product scope exists.

## Required local checks

```bash
pnpm format
pnpm lint
pnpm check-types
pnpm test
pnpm build
pnpm exec turbo boundaries
pnpm docs:check
```

For pull requests, CI runs the equivalent affected task set:

```bash
pnpm exec turbo run build lint check-types test --affected
```

## Coverage and test ownership

Add tests close to the implementation they cover. Keep browser tests in `e2e/`
and component stories in `packages/ui/src/components`. Tests should verify
behavior and public contracts rather than internal implementation details.

## Technical coverage contract

Every new feature should document:

- expected loading, empty, error, and not-found states;
- validation and authorization boundaries;
- network failure and retry behavior;
- logs, error reports, request IDs, and user-safe messages;
- the unit/component/E2E layer that protects the critical behavior.

The web application architecture and error/network conventions are documented
in [`apps/web/docs/ARCHITECTURE.md`](../apps/web/docs/ARCHITECTURE.md). Shared
observability requirements are documented in
[`docs/OBSERVABILITY.md`](OBSERVABILITY.md).
