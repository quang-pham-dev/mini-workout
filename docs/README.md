# Documentation Index

This directory contains the current repository architecture, engineering
guidance, testing strategy, and product roadmap.

## Engineering documentation

- [`AGENT_WORKFLOW.md`](AGENT_WORKFLOW.md) — team workflow for starting,
  implementing, verifying, reviewing, and handing off features with agents.
- [`AGENT_HARNESS_REVIEW.md`](AGENT_HARNESS_REVIEW.md) — harness assessment,
  skill governance, and improvement roadmap.
- [`ARCHITECTURE.md`](ARCHITECTURE.md) — workspace structure, package
  boundaries, Turborepo tasks, and caching.
- [`TESTING.md`](TESTING.md) — unit, component, Storybook, and E2E testing.
- [`OBSERVABILITY.md`](OBSERVABILITY.md) — logging, errors, tracing, Web
  Vitals, health, and alerting contracts.
- [`NEXTJS_16_3_WORKOUT_MASTER_PLAN.md`](NEXTJS_16_3_WORKOUT_MASTER_PLAN.md) —
  product scope and learning roadmap, with implementation status.

## Next.js 16.3 experiments

- [`nextjs-16.3/05-cache-components.md`](nextjs-16.3/05-cache-components.md) —
  shared Cache Components boundaries and `use cache` observations.
- [`nextjs-16.3/06-cache-invalidation.md`](nextjs-16.3/06-cache-invalidation.md)
  — cache tags, invalidation helpers, and mutation rules.

## Repository policies

- [`../CONTRIBUTING.md`](../CONTRIBUTING.md) — setup, contribution workflow,
  and required checks.
- [`../SECURITY.md`](../SECURITY.md) — vulnerability reporting and security
  expectations.
- [`../DESIGN.md`](../DESIGN.md) — current design sources and review guidance.

## Project architecture

- [`../apps/web/docs/ARCHITECTURE.md`](../apps/web/docs/ARCHITECTURE.md) — web
  routes, data, errors, security, network, and testing conventions.
- [`../apps/admin/docs/ARCHITECTURE.md`](../apps/admin/docs/ARCHITECTURE.md) —
  admin route, feature, server-function, query-cache, and lifecycle rules.
- [`../apps/storybook/docs/ARCHITECTURE.md`](../apps/storybook/docs/ARCHITECTURE.md)
  — Storybook ownership and visual/a11y testing rules.
- [`../packages/ui/docs/ARCHITECTURE.md`](../packages/ui/docs/ARCHITECTURE.md)
  — UI package boundaries and public API rules.
- [`../packages/design-system/docs/ARCHITECTURE.md`](../packages/design-system/docs/ARCHITECTURE.md)
  — token, contract, and CSS adapter ownership.

## Documentation standards

Documentation must describe the repository as it exists today. Planned product
features must be labeled as planned and must not be presented as implemented
behavior. Commands should use the repository's pnpm scripts or `pnpm exec turbo
run` form so that examples remain reproducible.
