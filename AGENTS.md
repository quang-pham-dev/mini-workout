# Repository Guidelines

## Project Structure & Module Organization

This repository is a Turborepo monorepo.

- `apps/web/` is the main Next.js app. App Router code lives in `apps/web/app/`, static files in `apps/web/public/`, and fonts in `apps/web/app/fonts/`.
- `packages/ui/` contains shared React UI components such as `src/button.tsx`, `src/card.tsx`, and `src/code.tsx`.
- Shared TypeScript types must live with their owner: domain contracts in
  `packages/core`, generated persistence types in `packages/database`, and
  app/transport types in the owning app. Do not create a generic `types`
  package; create `@mini-workout/contracts` only when an independent API,
  mobile, worker, or other runtime boundary genuinely needs public Zod DTOs.
- `config/` holds shared tooling presets for ESLint, Prettier, TypeScript, and Vitest.
- `e2e/` contains Playwright public/authenticated browser journeys and fixture-safety contracts.
- `docs/` contains design and implementation notes.

## Build, Test, and Development Commands

Run commands from the repository root with `pnpm`.

Use Node.js `>=22.6.0`; `nvm use` selects the version pinned in `.nvmrc`.

- `pnpm dev` starts all watched dev tasks through Turbo.
- `pnpm build` builds all apps and packages.
- `pnpm build:apps` builds only `apps/*`.
- `pnpm build:packages` builds only `packages/*`.
- `pnpm lint` runs workspace lint checks.
- `pnpm lint:fix` applies safe lint fixes.
- `pnpm format` checks formatting; `pnpm format:fix` writes fixes.
- `pnpm check-types` runs TypeScript validation across the repo.
- `pnpm test`, `pnpm test:watch`, and `pnpm test:coverage` run the test suite via Turbo.
- `pnpm test:e2e` builds the web app and runs the public Playwright projects by default.
- `pnpm --filter @mini-workout/e2e test` runs DB-free E2E fixture/configuration contracts.
- `pnpm --filter web dev` starts the Next.js app on port `3000`.

## Coding Style & Naming Conventions

Use TypeScript everywhere and follow the shared Prettier and ESLint presets in `config/`.

- Prefer 2-space indentation and the repo formatter.
- Use `PascalCase` for React components, `camelCase` for variables and functions, and `kebab-case` for filenames when practical.
- Keep imports sorted and remove unused code before committing.

## Testing Guidelines

Place unit or component tests near the code they cover when possible; keep browser flows in `e2e/`.

- Test files should use `*.test.ts`, `*.test.tsx`, or `*.spec.ts`.
- Prefer behavior-focused names, for example: `it('renders the workout card title')`.
- Run `pnpm test` for the full suite and `pnpm test:coverage` before larger changes.

## Commit & Pull Request Guidelines

This repo has no commit history yet, but `commitlint` and Husky are configured. Use conventional commits such as `feat: add workout card`.

- Keep PRs focused and describe the user-visible change.
- Link related issues when available.
- Include screenshots or short screen recordings for UI changes.
- Mention follow-up work, migrations, or environment steps in the PR description.

## Agent-Specific Notes

Prefer workspace scripts over ad hoc commands. When changing shared config in `config/`, verify the affected app/package still type-checks and lints cleanly.

## Mandatory Error Handling Convention

When touching error handling, API routes, Server Actions, server functions,
auth boundaries, data fetching, or observability, read and follow
[`docs/ERROR_HANDLING_CONVENTION.md`](docs/ERROR_HANDLING_CONVENTION.md).
Generated code must use the shared error contract, preserve framework
control-flow, report unexpected errors once, sanitize telemetry, and include
tests for error mapping and alert-noise behavior.
