# Phase 02 — Design

## Goal

Resolve design and architecture decisions before implementation creates rework.

## Required actions

- For UI work, establish hierarchy, states, responsive behavior, accessibility,
  typography, spacing, and interaction states before writing components.
- Reuse design-system tokens (`packages/design-system`) and shared UI primitives
  (`packages/ui`) where they are the owner. New tokens must be added to both Light
  and Dark themes. New components in `packages/ui` require a Storybook story.
- For React APIs, prefer composition and explicit variants over boolean-prop
  growth; keep state ownership close to the feature that owns it.
- For database work, confirm schema ownership, relations, indexes, migration
  strategy, transaction boundaries, and generated-client expectations.
- For server/data work, define validation, error mapping, authorization, and
  observability behavior before coding. Read the `observability-convention` skill
  and `docs/ERROR_HANDLING_CONVENTION.md` before designing any error boundary.
- For `apps/admin` (TanStack Start), decide for each operation whether it belongs
  in a **loader** (read, pre-populate cache) or a **server function** (mutation,
  side-effect). Server functions must declare their Zod input schema and error
  contract before implementation. Confirm SSR isolation: each request gets its
  own TanStack Query `queryClient`.
- For auth changes in either app, use the `better-auth` skill. Confirm which
  auth instance (Web or Admin) is affected; they are intentionally separate
  runtime boundaries.

## Storybook story trigger

A new `packages/ui` component or a visual state change requires a story:

- new component → new `*.stories.tsx` file beside the component
- new variant or interactive state → new named export in existing story
- accessibility change → verify with `addon-a11y` before shipping

## Output

Provide a short decision record in the plan or relevant documentation whenever
the change introduces a new boundary, public API, schema, or design pattern.
For `apps/admin` server functions, include: input schema, error contract, and
whether the operation is idempotent.
