# Landing Spike A — Astro + Sanity Preview

**Status:** Secure implementation complete locally; deployed gate remains open  
**Date:** 2026-09-23  
**Timebox:** Initial local spike session (not the full three-day allocation)  
**Prototype:** Disposable project at `/private/tmp/landing-astro-spike`; no
prototype code or dependency changes were added to the workspace.

## Question

Can one Astro source tree produce static production output and a secure SSR
editor preview with acceptable integration complexity on Vercel?

## Prototype scope

- Astro 7.3.4, `@astrojs/vercel` 11.0.11, `@sanity/astro` 3.5.1,
  `@sanity/client` 7.27.0, `@sanity/preview-url-secret` 4.1.5 and React 19.3.0
  in the isolated prototype.
- A static home page and campaign page from a deterministic local fixture.
- A preview-only draft route and a draft-mode enable endpoint using Sanity's
  `validatePreviewUrl` API shape.
- Build modes controlled by `LANDING_OUTPUT=static|preview`.
- No Sanity project credentials were available, so real GROQ requests, secret
  validation against Content Lake and Presentation Tool editing were not run.

## Evidence

| Check                                       | Result                     | Evidence                                                                                                                                                                                                                                    |
| ------------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Static Astro build                          | Pass                       | `LANDING_OUTPUT=static pnpm build`; emits static home/campaign HTML in about 1 second                                                                                                                                                       |
| Vercel SSR build                            | Pass                       | `LANDING_OUTPUT=preview pnpm build`; emits `.vercel/output` with `_render` function                                                                                                                                                         |
| TypeScript source check                     | Pass                       | After pinning the disposable fixture to repo TypeScript 5.9.2, `pnpm exec astro sync && pnpm exec tsc --noEmit` passes; `@sanity/astro/module` type reference and `@types/node` are required                                                |
| Astro component diagnostics                 | Blocked offline            | `astro check` requires `@astrojs/check`; offline install could not resolve its package metadata, so no network install was attempted                                                                                                        |
| Vercel runtime                              | Conditional                | Adapter targets `nodejs24.x`; local Node 25 warning says deployment uses Node 24                                                                                                                                                            |
| Primary content                             | Pass                       | Static HTML contains the page `h1`, body and link directly                                                                                                                                                                                  |
| Hydration on static pages                   | Pass for current fixture   | No `<script>` tags in generated page HTML; an unused tiny empty `VisualEditing` stub asset is emitted                                                                                                                                       |
| Draft content safety                        | Incomplete                 | Static page is rendered as published fixture; no real draft token/request was available                                                                                                                                                     |
| Preview secret validation                   | Incomplete                 | Code path is wired to the package API, but requires a real Sanity project/token to exercise                                                                                                                                                 |
| Local preview serving                       | Pass                       | Astro dev server returns campaign SSR HTML; this does not validate the built Vercel adapter runtime                                                                                                                                         |
| Missing and malformed preview configuration | Pass                       | Missing `SANITY_API_READ_TOKEN` returns 503; malformed unsigned preview URL returns 401 when a dummy token is configured                                                                                                                    |
| Direct draft cookie behavior                | Security finding (fixture) | A manually supplied `sanity-preview-perspective=drafts` cookie switches the local fixture page to its draft branch. This confirms the app must not treat the cookie as authorization; it does not exercise Sanity Content Lake draft access |
| Static preview endpoint handling            | Concern                    | Static build emits `/api/draft-mode/enable` as a file containing `Not found`; the local generic static server returns 404 for it, but Vercel routing still needs validation. Keep preview endpoints off the public production origin        |
| SSR bundle size                             | Concern                    | Vite reports the `prerender-entry` chunk over 500 kB in the preview build; determine whether Sanity Studio/runtime code is being pulled into the frontend and split it if possible                                                          |

## Findings

1. Static production and Vercel SSR builds work from the same source when they
   use separate build modes. They are separate artifacts/deployments, not one
   build that changes output mode at request time.
2. Sanity's Astro guide says Visual Editing needs `output: "server"` because
   draft mode reads request cookies. A static build cannot switch between
   published and draft content per request. The plan's separate static
   production and SSR preview deployment remains the right shape.
3. Sanity's perspective cookie is a client-readable mode/perspective signal set
   after secret validation, not a signed authorization token. Visual Editing
   needs to update it when the editor changes perspective. A forged cookie can
   request draft data if the SSR preview host is publicly reachable. Protect the
   entire preview deployment with Vercel Deployment Protection or equivalent;
   validate the secret as well, and keep the read token server-only.
4. The build mode must also control inclusion of preview endpoints and
   preview-only React code. The spike currently still emits a harmless-looking
   static endpoint file; keep preview endpoints on a protected preview origin
   and confirm Vercel status behavior before the architecture gate can pass.
5. Build success alone does not prove Visual Editing works. A Sanity project and
   an accessible SSR deployment are required to validate secure handshake,
   draft cookies, editing overlays, perspective changes and content refresh.
6. Align local/CI Node to 22.20.0 or explicitly configure the Astro Vercel
   runtime to Node 24. The deployment build contract must not depend on Node 25.
7. The current preview artifact includes a >500 kB warning. Treat the preview
   server bundle and browser JavaScript separately: only browser bundles affect
   the page JS budget, but large server bundles can still affect cold starts.
8. The sample Vercel build also warns that the Node 25 local runtime is
   unsupported and the adapter will use Node 24. Keep that warning as a failed
   environment-alignment check until the actual app/CI runtime contract is
   selected. `tsc --noEmit` passed, but Astro template diagnostics still need
   `@astrojs/check` or the supported type-check path for the selected Astro
   version.

The fixture also confirms why build-only evidence is insufficient: Astro's
build transpiles the source, while TypeScript validation is a separate check.
The official [Astro TypeScript guide](https://docs.astro.build/en/guides/typescript/)
describes separate type-check tooling; the precise supported Astro diagnostic
package should be pinned with the production Astro version.

## Gate decision

**Not passed yet.** Build-mode feasibility and local SSR request behavior are
demonstrated. Secure editor preview, real Sanity authorization and the deployed
Vercel request path remain unverified. Continue the three-day timebox with these
tasks:

- Run the built adapter artifact with the supported Vercel local runtime; the
  Astro development server works, but it does not validate the Vercel adapter.
- Use a Sanity test project to verify a valid secret enables preview, an invalid
  secret is rejected, draft fields render, visual editing updates after edits,
  and preview mode stays `noindex` and uncached.
- Confirm static deployment returns a true 404 for preview endpoints and has no
  loaded Visual Editing or React client scripts.
- Verify Vercel Deployment Protection blocks direct anonymous requests to the
  SSR preview host while Presentation Tool can use the supported bypass flow.
- Inspect the >500 kB server chunk and record cold-start/runtime implications.
- Test the separate deployment arrangement with deployment protection enabled
  and the Studio iframe bypass flow.

If those criteria cannot be proven within the agreed timebox, record the Astro
preview integration as a failed gate and compare the Next.js fallback using the
same content fixture and acceptance tests.

## Secure implementation update — 2026-09-24

The production app now supports two explicit artifacts from one source tree:
`LANDING_OUTPUT=static` remains the public zero-runtime site, while
`LANDING_OUTPUT=preview` uses the Vercel SSR adapter. Draft enable/disable routes
are injected only into the preview build; the static artifact was inspected and
contains neither endpoint. Preview middleware forces `private, no-store` and
`noindex, nofollow` on every response.

The enable boundary uses Sanity's official preview-secret validator with the
viewer token kept in server-only `SANITY_API_READ_TOKEN`. Missing configuration
fails with a sanitized 503, invalid secrets return 401, provider failure returns
a generic 503, redirects are constrained to root-relative paths, and the
perspective cookie is Secure, SameSite Lax and limited to one hour. It is
intentionally client-readable because Visual Editing synchronizes the active
perspective. The cookie is not authorization; the entire SSR preview deployment
still requires Vercel Deployment Protection.

Request-scoped repositories switch authenticated preview sessions to Sanity's
`drafts` perspective with CDN disabled. Preview GROQ preserves the existing
fail-closed Article, Category and Site Shell contracts. Studio Presentation now
resolves Home, Category and Article locations and disables preview sharing.
Draft responses enable stega/source metadata and load Sanity's Visual Editing
client only in the preview artifact. The static artifact remains at zero bytes
of first-party JavaScript.

Local evidence: the SSR Vercel artifact and Studio build pass; the static build
contains no draft endpoint; 80 Landing tests and 37 Studio tests pass; Astro
reports no diagnostics; the local preview root returns header and HTML
`noindex` plus `no-store`; and the enable endpoint fails closed without a
Landing read token. On 2026-09-25, the configured Viewer token was verified:
invalid secrets return 401, draft-perspective content returns 200 with stega,
and a headless browser reports no Visual Editing console error. Remaining
external evidence is the Studio-generated secret/iframe handshake and
Deployment Protection/bypass on an actual Vercel deployment.

## Sources checked

- [Astro on-demand rendering](https://docs.astro.build/en/guides/on-demand-rendering/)
- [Sanity Visual Editing with Astro](https://www.sanity.io/docs/astro/astro-visual-editing)
- [Sanity static and server rendering with Astro](https://www.sanity.io/docs/astro/static-and-server-rendering)
- [Vercel Astro framework documentation](https://vercel.com/docs/frameworks/frontend/astro)
