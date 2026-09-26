# Landing Spike B — Monorepo UI and CSS Interoperability

**Status:** Partial evidence; Astro workspace bundler check remains open  
**Date:** 2026-09-23  
**Timebox:** Initial local spike session (not the full two-day allocation)  
**Prototype:** Extended the disposable project at
`/private/tmp/landing-astro-spike`; no application source or dependency files in
the monorepo were changed.

## Question

Can Astro consume the shared Tailwind/design-system foundation without
duplicating CSS, breaking content scanning or shipping unnecessary React?

## Prototype and evidence

- Astro 7.3.4 with Tailwind CSS 4.3.3 Vite plugin and React integration.
- Imported `packages/design-system/globals.css` and registered the existing UI
  package source as a Tailwind source root.
- Rendered the existing compiled `@mini-workout/ui` Button as a React island on
  the homepage. Campaign content remained an Astro component without hydration.
- Static `pnpm build` passed.
- Generated CSS includes the shared design tokens and Button utility classes;
  homepage HTML server-renders the Button markup.
- The homepage's compressed island assets measured approximately:
  - Astro hydration runtime: 65.9 KB gzip.
  - React renderer: 3.3 KB gzip.
  - Button island module: 10.3 KB gzip.
  - Generated CSS: 5.2 KB gzip.
  - Combined first-party JavaScript for this one island: approximately 79.5 KB
    gzip, excluding any future analytics/consent scripts.
- Static article/campaign pages without islands have no hydration scripts. The
  homepage downloads the runtime only because it contains `client:load`.

## Findings

1. The repository's CSS token and utility layer compiles under Astro/Tailwind 4
   without copying tokens into the app.
2. The compiled React Button can be server-rendered and hydrated inside one Astro
   island. It does not require React ownership of the surrounding page.
3. An island creates a material but contained JS cost. The sample stayed below
   the proposed 120 KB compressed first-party JS budget, but the budget must be
   measured page-by-page. Islands on content routes can accumulate quickly.
4. Use `.astro` sections for all static marketing content. Reserve
   `@mini-workout/ui` for interactions that benefit from its React contract.
5. The spike imported the CSS and compiled Button by absolute local paths. A
   follow-up Node resolution check confirmed the documented workspace exports
   resolve to `packages/ui/dist/button.mjs` and
   `packages/design-system/globals.css`. This closes package-export existence,
   but does not prove Astro/Vite bundling of workspace symlinks, Tailwind
   scanning in a workspace app, or package boundary checks from Landing.
6. `@mini-workout/ui` output has a top-level `'use client'` banner from tsup.
   The Astro integration still produced SSR HTML and scoped hydration in this
   prototype, but the workspace check should confirm this boundary under the
   actual app bundler and prohibit hydration when `client:*` is absent.

## Gate decision

**Partial pass.** CSS compatibility, island scoping and public export resolution
are demonstrated separately. Full pass requires an `apps/landing` workspace
fixture that imports only public workspace exports, then verifies Tailwind
scanning and Vite bundling through the pnpm symlink, no hydration for static
components and no package-boundary exceptions.

## Decision for the plan

- Continue sharing `@mini-workout/design-system` tokens.
- Keep page sections and navigation Astro-native.
- Permit React islands for interaction only; require each island to name its
  browser capability and record its compressed JS contribution.
- Do not expand the UI package solely to avoid writing small semantic Astro
  components.
