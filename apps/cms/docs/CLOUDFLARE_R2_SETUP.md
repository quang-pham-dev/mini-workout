# Cloudflare R2 media setup (Mini Workout demo)

This runbook configures Strapi's existing `@strapi/provider-upload-aws-s3`
integration to store public landing media in Cloudflare R2. Local development
continues to use Strapi's local upload provider. For the current personal/demo
deployment, use a clearly named demo bucket; create separate buckets and
credentials if/when production environments are introduced.

This guide creates a public read URL for media. Anyone who has an object's URL
can read that object. Do not put private, user-specific, confidential or
licensed media in this bucket. The S3 API credentials remain private and are
only for Strapi server-side use.

## Important checks before connecting Strapi

### Provider ACL compatibility is a release gate

The installed Strapi provider's README says the `ACL` parameter defaults to
`public-read`. Cloudflare R2's S3 compatibility table says ACL headers are not
supported for `PutObject` and multipart upload. This repository's current
`config/plugins.ts` sets the bucket but does not explicitly override that
default. Therefore, **do not assume the current Strapi upload configuration
will work with R2**. First upload a disposable file using the exact pinned
provider version. If the API returns `AccessControlListNotSupported` or another
ACL error, stop: do not broaden the token or turn on public S3 ACLs. The Strapi
provider configuration/code must be corrected and regression-tested before the
R2 upload gate can pass.

This is distinct from public read access: R2's custom domain makes object reads
public at the bucket/domain level. It does not require per-object `public-read`
ACLs.

### Vercel request-size compatibility

When Strapi runs as a Vercel container Function, uploads still pass through the
CMS HTTP request. Vercel documents a 4.5 MB request/response payload limit for
Functions. Test the largest real asset through the deployed Strapi Admin before
committing to this upload path. Small landing images may be fine; workout video
files are likely to need a different upload/hosting flow if they exceed the
platform limit. R2 storage itself does not bypass the CMS request limit.

## What you will create

- One Standard R2 bucket for the demo.
- One public HTTPS media hostname (preferred), or a temporary `r2.dev` URL for
  non-production testing only.
- One R2 S3 API token limited to Object Read & Write on that bucket.
- These environment variables in the CMS runtime:

```text
CMS_UPLOAD_PROVIDER=r2
R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
R2_BUCKET=<exact-bucket-name>
R2_ACCESS_KEY_ID=<secret>
R2_SECRET_ACCESS_KEY=<secret>
R2_PUBLIC_URL=https://<media-hostname>
R2_ROOT_PATH=landing
```

`R2_ACCESS_KEY_ID` and `R2_SECRET_ACCESS_KEY` are secrets. `R2_ENDPOINT`,
`R2_BUCKET`, `R2_PUBLIC_URL` and `R2_ROOT_PATH` are configuration, but should
still only be entered in the intended environment. Keep domain names
environment-driven; examples here are placeholders, not fixed project
domains.

## Step 1 — Prepare Cloudflare and choose the media hostname

1. Sign in to the Cloudflare account that will own the demo bucket.
2. Open **Storage & databases → R2 Object Storage**. If Cloudflare asks you to
   enable/subscribe to R2, review the current plan and billing screen before
   confirming. Free-tier limits can change; the current R2 pricing page lists
   monthly Standard storage/operation allowances and free internet egress.
3. Decide which public URL to use:
   - **Preferred:** a hostname such as `media.<your-domain>`. The domain must
     already be a zone in the same Cloudflare account as the R2 bucket. You do
     not need to commit this hostname to the repo; put it in `R2_PUBLIC_URL`.
   - **Temporary test only:** the bucket's Cloudflare-managed `r2.dev` URL. It
     is rate-limited and intended for development/non-production. Do not use it
     for a public launch.

If you do not yet have a domain in this Cloudflare account, you can use the
temporary option to prove the provider, but the later custom-domain step is
still required before relying on the media origin for the demo site.

## Step 2 — Create a Standard bucket

1. In R2 Overview, select **Create bucket**.
2. Use an unmistakable demo name, for example `mini-workout-cms-demo` (or a
   unique variation if it is already taken in your account).
3. Select the Standard storage class. Choose the default/automatic location
   unless you have a specific data-location requirement.
4. Create the bucket and copy its exact name into your deployment notes. Do not
   put files in the bucket manually yet; Strapi should create media objects and
   matching Media Library records together.
5. Leave the bucket's S3 API protected by credentials. Do not create an
   account-wide Cloudflare API token for this integration.

## Step 3 — Enable public reads through a custom domain

Use this step when the custom media hostname is ready.

1. Open the bucket, then go to **Settings → Custom Domains** (the Dashboard may
   label this area **Public access → Custom Domains**).
2. Select **Connect domain/Add**, enter the chosen media hostname, and continue.
3. Review the DNS change. If the zone is already in this Cloudflare account,
   Cloudflare can create the required record; confirm **Connect domain**.
4. Wait until the domain's ownership/TLS status is **Active**. This can take a
   few minutes. Refresh the page if needed.
5. Do not enable `r2.dev` as a second public access path when the custom domain
   is in use. If it was enabled for testing, disable it after confirming the
   custom domain works.

The custom domain exposes object URLs publicly. R2 does not allow listing
objects at the root URL, but that is not a substitute for access control: treat
all files in this bucket as public. If the domain is not already a Cloudflare
zone, stop here and first add the domain to the same account (or use `r2.dev`
temporarily for the non-production test).

### Temporary `r2.dev` alternative

If you have not connected a custom domain yet:

1. Open the bucket **Settings → Public Development URL**.
2. Select **Enable** and type `allow` to confirm public access.
3. Copy the complete generated Public Bucket URL exactly as shown in the
   Dashboard into the temporary `R2_PUBLIC_URL` value; do not construct the
   `r2.dev` hostname yourself.
4. Remember this URL is rate-limited and non-production. Replace it with the
   custom domain and redeploy/restart Strapi before relying on it for the demo.

## Step 4 — Create bucket-scoped S3 credentials

1. From R2 Overview, open **Manage R2 API tokens** (sometimes shown as **Manage
   API Tokens**).
2. Create an R2 S3 API token. A Cloudflare REST API token is not interchangeable
   with the S3 Access Key ID/Secret Access Key required by Strapi.
3. Choose **Object Read & Write** permission.
4. Under bucket scope, select **Apply to specific buckets only** and select
   only the demo bucket created above.
5. Create the token.
6. Copy the **Access Key ID** and **Secret Access Key** immediately into a
   password manager or directly into the deployment secret form. Cloudflare
   does not show the secret again after leaving the confirmation screen.
7. Copy the S3 endpoint shown by Cloudflare. It has this form:
   `https://<account-id>.r2.cloudflarestorage.com`.

Do not paste either key into ChatGPT, a ticket, a screenshot, source code, or a
committed `.env` file. Do not grant access to all buckets when a single-bucket
scope is available.

## Step 5 — Add environment variables to the CMS deployment

In the Vercel project that will run **Strapi CMS** (not just the Landing
project), open **Settings → Environment Variables**. Add the variables below to
the preview environment used for the R2 test. Enter the real values in Vercel's
secret UI, never in chat or source control:

| Name                   | Value                                           | Secret? |
| ---------------------- | ----------------------------------------------- | ------- |
| `CMS_UPLOAD_PROVIDER`  | `r2`                                            | No      |
| `R2_ENDPOINT`          | `https://<account-id>.r2.cloudflarestorage.com` | No      |
| `R2_BUCKET`            | Exact bucket name                               | No      |
| `R2_ACCESS_KEY_ID`     | Access Key ID from Step 4                       | Yes     |
| `R2_SECRET_ACCESS_KEY` | Secret Access Key from Step 4                   | Yes     |
| `R2_PUBLIC_URL`        | `https://<media-hostname>` with no path         | No      |
| `R2_ROOT_PATH`         | `landing`                                       | No      |

Also retain the app's other required CMS environment variables. In production
mode this repo validates PostgreSQL, HTTPS origins, Strapi secrets and the R2
settings at startup. Do not set `CMS_UPLOAD_PROVIDER=r2` in local development
unless you intentionally want local Strapi to write real objects to this demo
bucket.

After changing environment variables, redeploy/restart the CMS. The provider is
selected at startup, and Strapi's security middleware uses `R2_PUBLIC_URL` in
its Content Security Policy. A changed hostname therefore needs a new runtime
deployment before testing Admin thumbnails.

## Step 6 — Prove Strapi can write and the public site can read

Do this on a non-production preview deployment, before migrating existing
content.

1. Open the CMS Admin and confirm `/_health` returns HTTP `204`.
2. In **Content Manager → Media Library**, upload a disposable JPEG or WebP
   smaller than 1 MB. Do not start with a video or important asset.
3. Confirm the upload succeeds and a media record appears in the library.
   If it fails with an ACL error, stop and resolve the provider compatibility
   gate above before proceeding.
4. Open the media record and inspect its URL. It should start with
   `R2_PUBLIC_URL` and include the configured `landing` prefix somewhere in
   the object path.
5. Open that exact URL in a private/incognito browser window where you are not
   signed in to Strapi. Confirm the image loads. The read path should not need
   the S3 key or CMS auth.
6. Check the Admin thumbnail and a Landing preview page. If the Admin blocks
   the image, inspect the browser console for CSP messages and verify
   `R2_PUBLIC_URL` exactly matches the URL origin.
7. Upload the largest real image that the editorial workflow expects. Because
   this CMS is planned for Vercel, do not approve video upload until a file
   above the Vercel request limit has been explicitly tested or an alternate
   upload path is implemented.
8. Restart/redeploy the CMS, then open the same media URL again. It must still
   load; this proves the file is not only on the container filesystem.
9. Delete the disposable media item from the Strapi Media Library. Refresh the
   R2 object list and confirm the matching `landing/` object was removed. A
   cached public response may outlive deletion briefly, so use the R2 object
   list as the authoritative delete check.

Do not migrate existing Landing assets until this sequence passes. Existing
files in local `apps/cms/public/uploads` are not copied to R2 simply by setting
`CMS_UPLOAD_PROVIDER=r2`; they must be uploaded through the approved migration
workflow, which also creates the Strapi media records.

## Step 7 — Keep the demo bucket within the free allowance

R2's current Standard free tier lists 10 GB-month storage, 1 million Class A
requests, 10 million Class B requests and free Internet egress per month. Check
the live [R2 pricing page](https://developers.cloudflare.com/r2/pricing/) and
Cloudflare usage/billing dashboard before relying on these amounts; pricing and
included usage can change. Add usage notifications or budget monitoring if
available on the account. Public image reads still count as operations when
served from R2; Cloudflare cache hits can reduce requests reaching the bucket.

R2 is durable object storage, not by itself a backup/restore plan. Keep the
original media source files until a separate restore procedure is rehearsed.
Deleting a Media Library item deletes its R2 object; do not use real content for
the first delete test.

## Troubleshooting

- **`AccessDenied`:** confirm this is an R2 S3 token, it has Object Read & Write,
  it is scoped to the exact bucket, and `R2_BUCKET` matches exactly.
- **ACL-related error / `AccessControlListNotSupported`:** the pinned Strapi
  provider may be sending its default `public-read` ACL, which R2 does not
  support. Do not broaden token scope. Stop and fix/test provider behavior.
- **`InvalidAccessKeyId` or signature error:** verify the endpoint uses the
  correct account ID, both keys belong to this R2 token, region is `auto` in the
  provider config, and values have no extra whitespace.
- **Upload succeeds but returned URL points at the S3 API:** check `R2_PUBLIC_URL`
  and the provider `baseUrl` mapping.
- **HTTP 404 at the public URL:** verify the custom domain is Active, the exact
  key exists under the `landing/` prefix, and the URL has the right object path.
- **Admin thumbnail blocked:** verify the runtime has the exact
  `R2_PUBLIC_URL`, redeploy, then inspect the browser CSP error.
- **File too large or request times out on Vercel:** this is an ingress/runtime
  constraint, not an R2 bucket permission issue. Test a smaller optimized
  image; for larger video assets, pause and choose a supported direct-upload or
  dedicated video-hosting approach.
- **Delete appears to leave a public URL alive:** confirm the object is gone in
  the R2 dashboard and account for cache TTL before treating the public URL as
  deleted.

## What to report after completing the Cloudflare steps

You can report the bucket name, whether the custom domain status is Active, the
media hostname (or say that you used the temporary `r2.dev` URL), and which
environment variable names you configured. If an upload fails, send the exact
error text with any request ID, but redact keys, tokens, account credentials,
and signed URLs. **Never send the Access Key ID or Secret Access Key.**

## Official references

- [Cloudflare R2 S3 setup and bucket-scoped token](https://developers.cloudflare.com/r2/get-started/s3/)
- [Cloudflare R2 custom domains and public development URLs](https://developers.cloudflare.com/r2/buckets/public-buckets/)
- [Cloudflare R2 S3 compatibility, including ACL limitations](https://developers.cloudflare.com/r2/api/s3/api/)
- [Cloudflare R2 pricing](https://developers.cloudflare.com/r2/pricing/)
- [Strapi AWS S3 upload provider configuration](https://github.com/strapi/strapi/tree/v5.55.1/packages/providers/upload-aws-s3)
- [Strapi Docker and external upload provider guidance](https://docs.strapi.io/cms/installation/docker)
- [Vercel Function limits](https://vercel.com/docs/functions/limitations)
