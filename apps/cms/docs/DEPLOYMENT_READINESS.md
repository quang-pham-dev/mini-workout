# CMS deployment readiness

This runbook begins only after the local migration rehearsal passes. It prepares
staging and production but does not authorize a deployment or content write.

## Local-first gate

Run from the repository root:

```bash
nvm use
pnpm --filter @mini-workout/cms format
pnpm --filter @mini-workout/cms lint
pnpm --filter @mini-workout/cms check-types
pnpm --filter @mini-workout/cms test
pnpm --filter @mini-workout/cms test:migration-rehearsal
pnpm exec turbo run build --filter=@mini-workout/cms...
pnpm docs:check
```

The rehearsal uses a real local HTTP boundary, Bearer authentication and
multipart upload parsing, but no cloud account. It verifies:

- first apply creates/uploads expected resources;
- second apply updates/reuses without increasing resource counts;
- draft-capable content is never published by the migration;
- an invalid token is rejected without mutation;
- no external URL or credential is required.

## Environment mapping

Application logic does not change between environments. Only deployment
configuration changes:

| Concern         | Local                       | Staging/production               |
| --------------- | --------------------------- | -------------------------------- |
| Database        | SQLite                      | PostgreSQL                       |
| Upload provider | `CMS_UPLOAD_PROVIDER=local` | `CMS_UPLOAD_PROVIDER=r2`         |
| CMS URL         | `http://localhost:1337`     | HTTPS CMS origin                 |
| Media URL       | local `/uploads`            | dedicated HTTPS R2 custom domain |
| Migration API   | local mock or local Strapi  | deployed Strapi Content API      |
| Migration token | synthetic test token        | temporary scoped custom token    |
| Landing source  | fixtures during development | `strapi` after parity approval   |

Do not introduce environment-specific branches for content mapping. The same
`StrapiApplyClient` must be used for local rehearsal and remote dry-run.

## Staging preparation

1. Deploy the already-built CMS image with PostgreSQL and R2 configuration.
2. Run the health endpoint and the R2 upload/read/delete smoke test.
3. Create a temporary custom Content API token with only:
   - find/create/update on migration content types;
   - Upload find/upload.
4. Add approved Pricing to the provider-neutral manifest. Test-only synthetic
   Pricing must never be copied into a real manifest.
5. Export the manifest and record its checksum in the rollout ticket.
6. Run migration dry-run against staging. Review every action and blocker.
7. Apply with the exact reported `planRevision`.
8. Run the same dry-run again. Expected result: media `reuse`, documents
   `update`, no duplicate/conflict.
9. Run snapshot semantic parity and a Strapi-sourced Landing preview build.
10. Rotate/delete the migration token after acceptance.

## Production gate

Production apply remains blocked until all of the following are evidenced:

- approved Pricing, cancellation and refund content;
- staging apply-twice rehearsal without duplicates;
- PostgreSQL backup and restore rehearsal;
- R2 persistence and restore rehearsal;
- authenticated draft and published snapshot parity;
- Landing preview acceptance for all MVP routes;
- rollback owner and rollback artifact identified.

Never run `--apply` directly as the first request to an environment. Dry-run is
mandatory, and `--confirm-plan` must match the current revision exactly.

## Required remote variables

Configure these in the deployment secret manager, not source control or chat:

```text
DATABASE_CLIENT=postgres
DATABASE_URL=<secret>
CMS_UPLOAD_PROVIDER=r2
R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
R2_BUCKET=<environment-specific-bucket>
R2_ACCESS_KEY_ID=<secret>
R2_SECRET_ACCESS_KEY=<secret>
R2_PUBLIC_URL=https://<environment-media-domain>
PUBLIC_URL=https://<cms-domain>
LANDING_PREVIEW_URL=https://<protected-preview-domain>
STRAPI_API_URL=https://<cms-domain>
STRAPI_MIGRATION_TOKEN=<temporary-secret>
```

All existing Strapi application, preview and webhook secrets are also required.
Use separate buckets, databases and tokens per environment.
