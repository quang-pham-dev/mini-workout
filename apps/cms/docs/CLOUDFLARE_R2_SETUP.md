# Cloudflare R2 media setup

Strapi uses Cloudflare R2 through its S3-compatible API in production. Local
development keeps the built-in local upload provider so contributors do not
need cloud credentials.

R2 is the MVP choice because its Standard storage free tier currently includes
10 GB-month of storage, 1 million Class A operations, 10 million Class B
operations and free Internet egress each month. Cloudflare still requires an
R2 subscription/checkout setup, and pricing can change, so configure billing
alerts before production use.

## 1. Create the bucket and public hostname

1. Enable R2 and create a Standard storage bucket, for example
   `mini-workout-cms-production`.
2. Attach a dedicated custom domain, for example `media.mini-workout.com`. Do
   not use the development `r2.dev` URL in production.
3. Keep the bucket private at the S3 API boundary. The custom media hostname is
   the public read path used by Landing and Strapi Admin.
4. Configure a usage notification before the project approaches free-tier
   limits.

## 2. Create least-privilege credentials

Create an R2 API token scoped to this bucket with Object Read & Write access.
Do not use an account-wide Cloudflare API token. Record the Access Key ID and
Secret Access Key directly in the deployment environment; never commit or send
them in chat.

Use these production variables:

```text
CMS_UPLOAD_PROVIDER=r2
R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
R2_BUCKET=mini-workout-cms-production
R2_ACCESS_KEY_ID=<secret>
R2_SECRET_ACCESS_KEY=<secret>
R2_PUBLIC_URL=https://media.mini-workout.com
R2_ROOT_PATH=landing
```

`R2_PUBLIC_URL` and `R2_ENDPOINT` must be HTTPS origins without a path. The
optional `R2_ROOT_PATH` keeps this application's objects under one prefix.
Production startup fails closed when durable storage is missing or malformed.

For local development, keep only:

```text
CMS_UPLOAD_PROVIDER=local
```

## 3. Verify before cutover

1. Start the deployed CMS and confirm `/_health` succeeds.
2. Upload a small WebP or JPEG in Media Library.
3. Confirm the returned URL starts with `R2_PUBLIC_URL` and opens without CMS
   authentication.
4. Confirm the Admin thumbnail loads without a browser CSP error.
5. Reference the asset from a draft, open Landing Preview, and verify its alt
   text and intrinsic dimensions.
6. Restart/redeploy the CMS and confirm the asset still exists.
7. Delete the disposable asset and confirm it is removed from R2.

The database and bucket need independent backups. Object storage prevents
container loss; it does not replace versioning, retention or restore drills.

## Troubleshooting

- `AccessDenied`: verify the token is scoped to the selected bucket and has
  Object Read & Write permission.
- `Invalid URL`: both endpoint variables must include `https://`; neither may
  include a bucket path.
- Upload succeeds but the image is broken: verify the custom domain is active
  and exactly matches `R2_PUBLIC_URL`.
- Admin blocks thumbnails: verify the deployed environment contains
  `R2_PUBLIC_URL`, then rebuild/restart Strapi so its CSP is regenerated.
