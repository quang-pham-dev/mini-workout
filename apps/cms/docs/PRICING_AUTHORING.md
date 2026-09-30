# Pricing authoring contract

The Pricing singleton in Strapi is the source of truth for Landing copy and
presentation. Product owns the values and approved cancellation/refund text;
engineering must not invent them or put them in environment variables.

## Ownership and safety boundary

- Strapi owns plan names, display amounts, currency/locale, cadence,
  entitlements, CTA copy, recommendation state, approved terms and SEO copy.
- `enabled` controls whether an individual plan is included in the published
  Landing snapshot. At least one plan must remain enabled.
- `planId` is a stable integration key. Product and billing teams must align it
  with the member application's product mapping before publication.
- The member/billing backend remains authoritative for checkout availability,
  charged amount, tax, subscription state, cancellation and refunds. It must
  never trust a price sent by Landing or Strapi.
- Environment variables configure infrastructure only; they are not a pricing
  content channel.

## Publishing workflow

1. Product edits the Pricing singleton as a draft.
2. Product verifies amount minor units (`1000` means `10.00` for a currency
   with two minor units), cadence, `planId`, CTA and legal text.
3. Review the protected Landing Preview on desktop and mobile.
4. Obtain Product/Legal approval for pricing, cancellation and refund terms.
5. Publish in Strapi. The publish webhook queues a new static Landing build.
6. Verify `/pricing/` and a real checkout handoff. The billing backend must
   reject unknown or unavailable `planId` values.

To pause one offer, turn off `enabled` and publish. Do not unpublish the whole
Pricing singleton merely to pause sales: the route is an SEO surface. If every
offer must stop, keep at least one informational plan visible and have the
billing/member app enforce checkout availability; a dedicated maintenance
state can be added as a later approved contract.
