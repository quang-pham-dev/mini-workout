# Pricing content input

Pricing remains a product-owned launch input. The migration tooling must not
invent commercial values, cancellation language or refund terms.

## Required approval payload

Product supplies one JSON object matching the `pricing` field of the versioned
Landing migration manifest:

```json
{
  "_type": "pricingPage",
  "schemaVersion": 1,
  "status": "published",
  "title": "<approved page title>",
  "introduction": "<approved introduction>",
  "currencyCode": "<ISO 4217 code, for example USD>",
  "currencyMinorUnit": "<integer matching the currency>",
  "locale": "<BCP 47 locale, for example en-US>",
  "plans": [
    {
      "_key": "<stable editor key>",
      "planId": "<stable product-owned slug>",
      "name": "<approved plan name>",
      "summary": "<approved plan summary>",
      "amountMinor": "<non-negative integer; never a decimal amount>",
      "billing": { "cadence": "month|year", "interval": 1 },
      "entitlements": [
        { "_key": "<stable key>", "label": "<approved entitlement>" }
      ],
      "cta": { "label": "<approved CTA>", "action": "login|register" },
      "recommended": false
    }
  ],
  "faq": [
    {
      "_key": "<stable key>",
      "question": "<approved question>",
      "answer": "<approved answer>"
    }
  ],
  "cancellationTerms": "<approved cancellation terms>",
  "refundTerms": "<approved refund terms>",
  "seo": {
    "title": "<approved SEO title>",
    "description": "<approved SEO description>"
  }
}
```

For one-time billing use `"billing": { "cadence": "one_time" }` and omit
`interval`. `amountMinor` is the exact amount in the currency's minor unit: for
example, `1200` with USD means USD 12.00. Do not include payment-provider IDs,
secrets or checkout URLs; those belong to the product/payment system and are
resolved from the stable `planId`.

## Validate and merge locally

Keep the reviewed Pricing object in a separate JSON file, then merge it into a
new manifest:

```bash
pnpm --silent --filter @mini-workout/landing migration:export > /tmp/landing-base.json
pnpm --silent --filter @mini-workout/landing migration:merge-pricing \
  /tmp/landing-base.json /path/to/approved-pricing.json \
  > /tmp/landing-approved.json
```

The command never edits either input. The output path must be distinct from
both inputs because shell redirection truncates a file before the command reads
it. If the source manifest already contains Pricing, the command exits with
`RESOURCE_CONFLICT`; invalid manifest or Pricing input exits with
`INPUT_INVALID`. Neither failure prints commercial content.

After importing the approved manifest, use it as the semantic parity baseline:

```bash
LANDING_CONTENT_SOURCE=strapi \
  STRAPI_API_URL=http://127.0.0.1:1337 \
  STRAPI_API_READ_TOKEN=<local-read-token> \
  LANDING_PARITY_BASELINE_MANIFEST=/tmp/landing-approved.json \
  pnpm check:landing-content-parity
```

## Review and activation gates

1. Product and legal approve plan amounts, billing cadence, entitlements,
   cancellation terms, refund terms and CTA copy.
2. Engineering merges the approved object into a freshly exported manifest
   using `migration:merge-pricing`.
3. The shared manifest parser and Landing pricing mapper validate it locally.
4. Run the guarded migration dry-run, then the revision-confirmed apply twice.
5. Run semantic parity and both local Strapi-sourced Astro build modes.
6. Only then repeat against staging and enable the Pricing route in a reviewed
   public deployment.

The local build rehearsal uses an explicitly non-production contract fixture.
It verifies transport, auth, mapping and rendering only and is never an approved
commercial offer or migration input.
