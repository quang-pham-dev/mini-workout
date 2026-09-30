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
pnpm --filter @mini-workout/landing migration:export > /tmp/landing-manifest.json
pnpm --filter @mini-workout/cms migration:plan /tmp/landing-manifest.json
```

The planner never writes to Strapi. It orders authors/media, categories,
related content and singletons, and reports blockers such as missing Pricing or
media binaries. Re-running it with the same manifest produces the same plan
revision. An apply command will only be added after durable media storage and
idempotent upsert behavior are verified.

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
