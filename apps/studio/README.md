# `@mini-workout/studio`

Sanity Studio owns Landing editorial authoring and is intentionally isolated
from the Product/Admin React runtimes. It pins its own compatible React version.

The current offline schema slice covers Category, Article, Author, SEO, internal
links, Sanity image assets and the versioned Article prose/pull-quote sections.
Campaign, Pricing and publish webhooks remain gated by the Landing architecture
plan. Presentation targets a separately built, protected SSR Landing origin.

Copy `.env.example` to `apps/studio/.env` when a real Sanity project is
available. Studio and Landing use the same non-secret `SANITY_PROJECT_ID` and
`SANITY_DATASET` names, but each app loads its own `.env` file. The legacy
`SANITY_STUDIO_*` names remain accepted temporarily. Never place read/write
tokens in these variables or commit them.

The workspace `dev` and `build` scripts load `apps/studio/.env` and map the
shared names to Sanity's required `SANITY_STUDIO_*` build-time prefix inside the
child process. Run Studio through the package scripts below rather than invoking
the Sanity binary directly.

Set `LANDING_PREVIEW_URL` to the protected preview origin. Local Presentation
defaults to `http://localhost:4321`. The preview host must not be the public
static origin and must remain behind Deployment Protection.

The optional baseline seed command requires a short-lived Editor token in the
local `SANITY_AUTH_TOKEN` variable. This secret is used only by the Node seed
script and is not included in the Studio browser bundle. Create it in Sanity
Manage, place it in `apps/studio/.env`, and revoke it after bootstrapping.

```sh
# Read-only inventory check
pnpm --filter @mini-workout/studio seed:baseline

# Create only missing baseline documents and upload/reuse their images
pnpm --filter @mini-workout/studio seed:baseline -- --apply
```

The seed uses root document IDs without dots. Sanity treats every ID containing
a dot as a private subpath even in a public dataset. The guarded cleanup command
exists only for the original bootstrap migration and refuses to run unless all
replacement root documents exist:

```sh
pnpm --filter @mini-workout/studio cleanup:baseline-private
pnpm --filter @mini-workout/studio cleanup:baseline-private -- --apply
```

```sh
pnpm --filter @mini-workout/studio dev
pnpm --filter @mini-workout/studio test
pnpm --filter @mini-workout/studio check-types
pnpm --filter @mini-workout/studio build
```

The Studio desk groups Articles and Categories under Editorial, with Authors
under People. Slug and internal-link authoring validation mirrors the Landing
published-content boundary, and document previews expose the identifying text
and editorial image. Configuration singletons and additional page types are
added only after their Landing contracts exist.

Landing still defaults to local fixtures, but its activation gate is now
verified against this published dataset. Select `LANDING_CONTENT_SOURCE=sanity`
per environment only when that environment is intentionally CMS-backed.
