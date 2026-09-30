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

## Review and activation gates

1. Product and legal approve plan amounts, billing cadence, entitlements,
   cancellation terms, refund terms and CTA copy.
2. Engineering inserts the approved object into a freshly exported manifest.
3. The shared manifest parser and Landing pricing mapper validate it locally.
4. Run the guarded migration dry-run, then the revision-confirmed apply twice.
5. Run semantic parity and both local Strapi-sourced Astro build modes.
6. Only then repeat against staging and enable the Pricing route in a reviewed
   public deployment.

The local build rehearsal uses an explicitly non-production contract fixture.
It verifies transport, auth, mapping and rendering only and is never an approved
commercial offer or migration input.
