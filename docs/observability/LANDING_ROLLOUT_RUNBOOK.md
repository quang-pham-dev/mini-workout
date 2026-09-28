# Landing Rollout Runbook

## Purpose

Promote the static Astro Landing artifact from a protected Vercel candidate to
the approved public domain without coupling Product authentication, Admin or
Studio cookies to the marketing origin.

No hostname below is hard-coded in application code. Record the approved values
in the deployment environment and change-control ticket before touching DNS.

## Environment matrix

| Surface           | Local default              | Non-production                | Production contract                              |
| ----------------- | -------------------------- | ----------------------------- | ------------------------------------------------ |
| Landing           | `http://localhost:4321`    | protected Vercel candidate    | approved public marketing origin                 |
| Member            | `http://localhost:3000`    | member preview/staging origin | `MEMBER_APP_URL`; host-only auth cookies         |
| Admin             | app-owned local port       | protected Admin candidate     | separate Admin origin and ADMIN authorization    |
| Studio            | `http://localhost:3333`    | protected Studio candidate    | `SANITY_STUDIO_URL`; only allowed preview framer |
| Editorial preview | separate Astro SSR project | protected preview origin      | never indexable; private/no-store                |

Required Landing public configuration:

- `LANDING_SITE_URL`: exact canonical HTTPS origin;
- `MEMBER_APP_URL`: exact Member HTTPS origin;
- `LANDING_OUTPUT=static`;
- `LANDING_CONTENT_SOURCE=sanity` only after parity passes;
- `LANDING_INDEXING_ENABLED=false` until the final production gate;
- `LANDING_ANALYTICS_ENABLED=false` and
  `LANDING_EXPERIMENTS_ENABLED=false` until consent/legal activation.

Required preview configuration adds `LANDING_OUTPUT=preview`,
`SANITY_STUDIO_URL`, `SANITY_PROJECT_ID`, `SANITY_DATASET` and the documented
server-only preview/publishing secrets. Never expose the read token, webhook
secret or Deploy Hook URL through a public Vite variable.

## Candidate verification

1. Build the exact commit using the production Node/pnpm versions.
2. Confirm `.vercel/output/config.json` starts with a continuing security-header
   route, followed by Campaign outcomes and then normalization/filesystem rules.
3. Keep Deployment Protection enabled and indexing disabled.
4. Build the same candidate locally, then run:

   ```sh
   LANDING_ROLLOUT_URL=https://candidate.example \
   LANDING_ROLLOUT_INDEXABLE=false \
   pnpm --filter @mini-workout/landing check-rollout
   ```

   When Deployment Protection is enabled, inject
   `VERCEL_AUTOMATION_BYPASS_SECRET` from the local/CI secret store. The checker
   sends it only in `x-vercel-protection-bypass`; never append it to the URL or
   commit it to an env file.

5. Verify preview can be framed by the configured Studio origin but cannot be
   framed by another origin. Confirm `cache-control: private, no-store` and
   `x-robots-tag: noindex, nofollow`.
6. Run Landing Playwright, keyboard/a11y, visual breakpoints, artifact budgets
   and a manual cross-origin Login/Register smoke test.
7. Verify Better Auth trusted origins and Google OAuth callback values in the
   Member deployment before custom-domain traffic is introduced. Do not widen
   Product session-cookie domain.

The rollout checker compares deployed status, canonical, robots, sitemap and
security headers with the locally built sitemap. It never prints response body
or raw headers.

## Cutover

1. Capture the current DNS/Vercel alias values and rollback owner.
2. Keep the old Web root available for at least one release window.
3. Attach the approved Landing domain and verify TLS before changing traffic.
4. Run the non-indexable rollout check against the final domain.
5. Smoke Home, Category, Article, current Campaign outcomes, 404, robots,
   sitemap and Member Login/Register navigation.
6. Enable `LANDING_INDEXING_ENABLED=true` only on the Vercel production
   environment and rebuild.
7. Run the rollout check with `LANDING_ROLLOUT_INDEXABLE=true`, submit the
   sitemap and begin crawl/CWV/error/conversion monitoring.

## Rollback

Rollback immediately for canonical-origin drift, incorrect indexing, broken
Member navigation, missing security headers, elevated errors, unexpected 404s,
or a material CWV/conversion regression.

1. Restore the previous Vercel alias/DNS target; do not delete either artifact.
2. Disable Landing indexing if crawler behavior is uncertain.
3. Disable analytics and experiments independently if they are implicated.
4. Purge or correct only the affected permanent redirect after its exact source
   and destination are confirmed.
5. Re-run the rollout checker against the restored origin and document the
   incident, affected commit and recovery time.

HSTS deliberately omits `includeSubDomains` and preload. Reconsider them only
after Landing, Member, Admin, Studio and mail-related subdomains are all proven
HTTPS-only and the rollback implications are accepted.
