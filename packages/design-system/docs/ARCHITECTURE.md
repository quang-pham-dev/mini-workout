# Design System Architecture

The design system has two layers:

```text
platform-neutral foundation
  ├── semantic token names
  └── component contracts

web adapter
  ├── Tailwind CSS tokens
  ├── light/dark themes
  └── global utilities and reset
```

The package does not render UI. `@mini-workout/ui` is the current web renderer.
A future native renderer may consume the same foundation without importing web
CSS or DOM dependencies.

## Drift controls

- Keep semantic names in `src/tokens.ts` and CSS variables aligned.
- Keep compatibility aliases explicit in `@theme inline` and both theme files.
- Keep every named `--animate-*` contract paired with a local keyframe.
- Keep component variant maps typed with contract variants using TypeScript
  `satisfies` checks.
- Run package type-check and build when token or contract names change.
- Run `pnpm check-foundation` when token, theme, consumer, or CSS ownership
  files change.
- Prefer a single semantic concept over aliases with different names.
- When the native project begins, introduce generation or a manifest only if
  manual synchronization becomes a measured maintenance problem.

## Change ownership

- `design-tokens.css`: web primitive and Tailwind theme definitions.
- `theme-light.css` / `theme-dark.css`: semantic web values.
- `globals.css`: web reset and shared utilities.
- `src/tokens.ts`: platform-neutral token vocabulary and types.
- `src/contracts.ts`: component names, variants, and accessibility rules.

Do not add React, DOM, Tailwind runtime, or native rendering code to the
platform-neutral TypeScript foundation.
