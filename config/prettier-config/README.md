# `@mini-workout/prettier-config`

Shared Prettier configuration for JavaScript, TypeScript, CSS, JSON, YAML, and
Markdown files in the monorepo. The package also enables the configured import
sorting plugin.

## Usage

Declare the shared configuration in an app or package `package.json`:

```json
{
  "prettier": "@mini-workout/prettier-config/base"
}
```

The root package already uses this configuration. No per-package `.prettierrc`
file is required unless a workspace has a documented exception.

## Commands

```bash
pnpm format
pnpm format:fix
```

Use the repository formatter in CI and before submitting a pull request.
