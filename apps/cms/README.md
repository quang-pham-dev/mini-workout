# Mini Workout CMS

Self-hosted Strapi 5 content service for `apps/landing`. Public Landing traffic
does not call this service at runtime: Astro consumes a versioned snapshot at
build time, while the protected preview deployment consumes the draft snapshot.

## Local development

Use the repository's Node version and create local secrets from `.env.example`.
SQLite is intentionally limited to local development.

```bash
nvm use
pnpm install
pnpm --filter @mini-workout/cms dev
```

The local Admin is available at `http://localhost:1337/admin`. Content schemas
are source-controlled under `src/api/**/content-types` and `src/components`.
Do not make production-only schema changes through the Content-Type Builder
without committing the generated schema files.

## Content API tokens

Create two custom, read-only Content API tokens in Strapi:

- Landing build token: permit only `landing.publishedSnapshot`.
- Landing preview token: permit only `landing.draftSnapshot`.

Do not grant anonymous Public-role access to either snapshot route. Configure
the Landing deployment with:

```text
LANDING_CONTENT_SOURCE=strapi
STRAPI_API_URL=https://studio.example.com
STRAPI_API_READ_TOKEN=<published-snapshot-token>
STRAPI_PREVIEW_READ_TOKEN=<draft-snapshot-token>
STRAPI_PREVIEW_SECRET=<same-value-as-cms>
```

The CMS Preview handler also requires:

```text
LANDING_PREVIEW_URL=https://preview.example.com
STRAPI_PREVIEW_SECRET=<same-value-as-landing>
```

The shared preview secret must be high entropy. It is used only to sign
short-lived preview URLs; it is never placed in a URL.

## Publishing webhook

Create a Strapi webhook targeting the protected Landing preview deployment:

```text
https://preview.example.com/api/webhooks/strapi/publish
```

Subscribe only to entry publish, unpublish and delete plus media update/delete.
Do not subscribe to entry update: saving a draft must not deploy the public
site. Configure the same high-entropy value as `STRAPI_WEBHOOK_TOKEN` in CMS
and Landing; Strapi sends it through the default `Authorization: Bearer ...`
header configured in `config/server.ts`. Landing also needs its private
`VERCEL_DEPLOY_HOOK_URL`.

## Production

Build the container from the monorepo root:

```bash
docker build -f apps/cms/Dockerfile -t mini-workout-cms .
```

Production startup fails closed unless PostgreSQL, an HTTPS `PUBLIC_URL`, and
all Strapi secrets are configured. The container enables this validation with
`CMS_VALIDATE_RUNTIME_CONFIG=true` and exposes `/_health` on port `1337`.

Production uses Cloudflare R2 through Strapi's S3-compatible upload provider;
local development keeps filesystem uploads. Follow the
[R2 setup runbook](docs/CLOUDFLARE_R2_SETUP.md) before cutover. Never store R2
credentials in source control.

## Pricing operations

Product manages Landing pricing through the Strapi Pricing singleton. The CMS
controls presentation and whether an individual plan is visible, while the
member/billing backend remains authoritative for the price charged and product
availability. Follow the [Pricing authoring contract](docs/PRICING_AUTHORING.md)
before publishing approved prices or legal terms.

## Offline content migration planning

Export a provider-neutral manifest from the currently reviewed Landing corpus,
then generate a deterministic Strapi import plan:

```bash
pnpm --silent --filter @mini-workout/landing migration:export > /tmp/landing-manifest.json
pnpm --filter @mini-workout/cms migration:plan /tmp/landing-manifest.json
pnpm --filter @mini-workout/cms migration:resolve-media /tmp/landing-manifest.json ../landing/public
```

Both commands are read-only. The planner orders authors/media, categories,
related content and singletons. The resolver confines assets to the supplied
root, rejects traversal and escaping symlinks, allows raster web formats up to
20 MiB, and records SHA-256 metadata. Exit code `2` means resolution succeeded
but another reported migration blocker, such as missing approved Pricing,
still prevents apply.

### Dry-run and apply

Create a dedicated temporary custom Content API token with only these
permissions:

- `find`, `create` and `update` for Author, Category, Article, Campaign,
  Marketing Page and the three single types;
- Upload `find` and `upload`.

Configure it outside source control:

```text
STRAPI_API_URL=https://studio.example.com
STRAPI_MIGRATION_TOKEN=<temporary-custom-token>
```

The command defaults to dry-run and performs discovery GET requests only:

```bash
pnpm --filter @mini-workout/cms migration:apply /tmp/landing-manifest.json ../landing/public
```

The report classifies every operation as `create`, `update`, `reuse` or
`upload`. It stops before network access when Pricing or media resolution is
blocked. Duplicate stable keys fail with `RESOURCE_CONFLICT`.

Apply requires the exact revision printed by the latest dry-run:

```bash
pnpm --filter @mini-workout/cms migration:apply /tmp/landing-manifest.json ../landing/public --apply --confirm-plan=<planRevision>
```

All content writes target draft state. The migration never publishes content;
Product must review Preview and publish from Strapi Admin. Media is reused by a
deterministic full SHA-256 name, and collection documents are updated by Strapi
5 `documentId` after stable-key lookup. Remove or rotate the temporary token
after migration.

Before connecting to any deployed environment, run the complete local HTTP
rehearsal. It uses an authenticated in-memory Strapi-compatible server on an
ephemeral `127.0.0.1` port and applies the same plan twice:

```bash
pnpm --filter @mini-workout/cms test:migration-rehearsal
```

The second pass must reuse media, update documents and leave every resource
count unchanged. Synthetic Pricing in this test is contract data only; it is
not exported, seeded or approved for public use. See the
[deployment readiness checklist](docs/DEPLOYMENT_READINESS.md) only after this
gate passes.

## Checks

```bash
pnpm --filter @mini-workout/cms format
pnpm --filter @mini-workout/cms lint
pnpm --filter @mini-workout/cms check-types
pnpm --filter @mini-workout/cms test
pnpm exec turbo run build --filter=@mini-workout/cms...
```

The dependency-inclusive filter is intentional: a clean checkout must build
`@mini-workout/contracts` before Strapi consumes its CommonJS artifact.

See the [Strapi migration plan](../../docs/superpowers/plans/2026-09-29-strapi-astro-migration.md)
for the publish, content migration, cutover and rollback gates.
