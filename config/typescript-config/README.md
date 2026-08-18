# `@mini-workout/typescript-config`

Shared strict TypeScript configurations for applications and packages.

## Available exports

- `@mini-workout/typescript-config/base.json`
- `@mini-workout/typescript-config/reactjs-library.json`
- `@mini-workout/typescript-config/vitejs-library.json`
- `@mini-workout/typescript-config/nextjs-library.json`

## Usage

Extend the configuration that matches the workspace:

```json
{
  "extends": "@mini-workout/typescript-config/reactjs-library.json",
  "include": ["src"]
}
```

```json
{
  "extends": "@mini-workout/typescript-config/nextjs-library.json",
  "include": ["**/*.ts", "**/*.tsx"]
}
```

The shared base enables strict checking, isolated modules, modern module
resolution, and safe indexed access behavior. Workspace-specific settings may
extend the base but should not weaken strictness without an explicit reason.

Run all workspace checks with:

```bash
pnpm check-types
```
