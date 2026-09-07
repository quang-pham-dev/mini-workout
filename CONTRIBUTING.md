# Contributing to Mini Workout

Thank you for contributing to Mini Workout. This repository is a pnpm and
Turborepo monorepo. Keep changes focused, document user-visible behavior, and
preserve clear ownership between apps and packages.

## Development setup

Requirements:

- Node.js `>=22.6.0`; use `nvm use` to select the version in `.nvmrc`.
- pnpm `10.30.0` or a compatible pnpm 10 release.

```bash
nvm use
pnpm install
pnpm dev
```

Use package filters when you only need one workspace:

```bash
pnpm --filter web dev
pnpm --filter @mini-workout/storybook dev
```

## Workspace rules

- Put deployable applications in `apps/`.
- Put reusable libraries and design/config packages in `packages/` or `config/`.
- Install dependencies in the workspace that uses them.
- Use the `workspace:*` protocol for internal dependencies.
- Import another workspace through its package export, never through a relative
  path into another package's source directory.
- Add or update package exports when adding a public entry point.
- Add package-level Turborepo configuration when a task differs from the root
  task graph.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the dependency graph and
package responsibilities.

## Required checks

Before opening a pull request, run:

```bash
pnpm format
pnpm lint
pnpm check-types
pnpm test
pnpm build
pnpm exec turbo boundaries
pnpm docs:check
```

For a focused change, use Turborepo filters. For CI-like validation, use the
affected workflow:

```bash
pnpm exec turbo run build lint check-types test --affected
```

## Adding a UI component

1. Add the implementation under `packages/ui/src/components/<name>/`.
2. Export it from the component index and the package entrypoint when it is
   public.
3. Add a Storybook story when the component has visual behavior.
4. Add focused tests for non-trivial behavior.
5. Confirm the generated package entrypoint is included in `package.json` and
   the tsup build configuration.
6. Update [`packages/ui/README.md`](packages/ui/README.md) when the public API
   changes.

## Commit messages

Use Conventional Commits:

```text
feat: add workout card
fix: correct button package export
docs: refresh development guide
chore: update workspace tooling
```

## Pull requests

- Keep the pull request focused and explain the user-visible result.
- Include tests or explain why tests are not applicable.
- Update documentation for public API, workflow, or user-facing changes.
- Mention migrations, environment variables, deployment changes, and follow-up
  work.
- Include screenshots or a short recording for visual UI changes.
- Do not commit secrets, local environment files, generated output, or root-owned
  cache artifacts.
