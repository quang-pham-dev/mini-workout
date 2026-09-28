import {
  mapPricingDocument,
  mapPublishedPricingDocuments,
} from '../src/content/published-pricing.js';
import { ContentContractError } from '../src/content/validation-primitives.js';
import { describe, expect, it } from 'vitest';

function validPricing() {
  return {
    _type: 'pricingPage',
    schemaVersion: 1,
    status: 'published',
    title: 'Choose the support that fits',
    introduction: 'Compare the approved ways to use Mini Workout.',
    currencyCode: 'USD',
    currencyMinorUnit: 2,
    locale: 'en-US',
    plans: [
      {
        _key: 'individual-monthly',
        planId: 'individual-monthly',
        name: 'Individual monthly',
        summary: 'A recurring plan for one member.',
        amountMinor: 1200,
        billing: { cadence: 'month', interval: 1 },
        entitlements: [
          { _key: 'library', label: 'Full movement library' },
          { _key: 'routine', label: 'Personal routine builder' },
        ],
        cta: { label: 'Build my routine', action: 'register' },
        recommended: true,
      },
      {
        _key: 'lifetime',
        planId: 'lifetime',
        name: 'Lifetime access',
        summary: 'One approved payment for ongoing access.',
        amountMinor: 9900,
        billing: { cadence: 'one_time' },
        entitlements: [{ _key: 'library', label: 'Full movement library' }],
        cta: { label: 'Build my routine', action: 'register' },
        recommended: false,
      },
    ],
    faq: [
      {
        _key: 'change-plan',
        question: 'Can I change plans?',
        answer: 'Use the approved account process described here.',
      },
    ],
    cancellationTerms: 'Cancel recurring access before the next billing date.',
    refundTerms: 'Refund eligibility follows the approved refund policy.',
    seo: {
      title: 'Pricing | Mini Workout',
      description: 'Compare approved Mini Workout plans.',
    },
  };
}

describe('published Pricing content contract', () => {
  it('maps exact commercial terms and derives the fixed canonical path', () => {
    const result = mapPricingDocument(validPricing());

    expect(result).toMatchObject({
      ok: true,
      value: {
        currencyCode: 'USD',
        currencyMinorUnit: 2,
        locale: 'en-US',
        plans: [
          {
            planId: 'individual-monthly',
            amountMinor: 1200,
            billing: { cadence: 'month', interval: 1 },
            recommended: true,
          },
          {
            planId: 'lifetime',
            billing: { cadence: 'one_time' },
          },
        ],
        seo: { canonicalPath: '/pricing/' },
      },
    });
  });

  it('rejects fractional money, inconsistent cadence and unsafe conversion actions', () => {
    const invalid = validPricing();
    invalid.plans[0]!.amountMinor = 12.5;
    invalid.plans[0]!.billing = {
      cadence: 'one_time',
      interval: 1,
    } as (typeof invalid.plans)[number]['billing'];
    invalid.plans[0]!.cta.action = 'checkout';

    const result = mapPricingDocument(invalid);
    expect(result).toMatchObject({ ok: false });
    if (!result.ok) {
      expect(result.issues).toEqual(
        expect.arrayContaining([
          { code: 'amount_minor', path: 'plans.0.amountMinor' },
          { code: 'billing_interval', path: 'plans.0.billing.interval' },
          { code: 'conversion_action', path: 'plans.0.cta.action' },
        ]),
      );
    }
  });

  it('requires unique plan IDs, one recommendation and unique entitlement keys', () => {
    const invalid = validPricing();
    invalid.plans[1]!.planId = invalid.plans[0]!.planId;
    invalid.plans[1]!.recommended = true;
    invalid.plans[0]!.entitlements[1]!._key = 'library';

    const result = mapPricingDocument(invalid);
    expect(result).toMatchObject({ ok: false });
    if (!result.ok) {
      expect(result.issues).toEqual(
        expect.arrayContaining([
          { code: 'duplicate_plan_id', path: 'plans.1.planId' },
          { code: 'recommended_plan', path: 'plans' },
          { code: 'entitlement_key', path: 'plans.0.entitlements' },
        ]),
      );
    }
  });

  it('requires supported currency/locale and approved cancellation/refund terms', () => {
    const mismatch = validPricing();
    mismatch.currencyMinorUnit = 0;
    const mismatchResult = mapPricingDocument(mismatch);
    expect(mismatchResult).toMatchObject({ ok: false });
    if (!mismatchResult.ok) {
      expect(mismatchResult.issues).toContainEqual({
        code: 'currency_minor_unit',
        path: 'currencyMinorUnit',
      });
    }

    const invalid = validPricing();
    invalid.currencyCode = 'usd';
    invalid.locale = 'english';
    invalid.cancellationTerms = '';
    invalid.refundTerms = '';

    const result = mapPricingDocument(invalid);
    expect(result).toMatchObject({ ok: false });
    if (!result.ok) {
      expect(result.issues).toEqual(
        expect.arrayContaining([
          { code: 'currency_code', path: 'currencyCode' },
          { code: 'locale', path: 'locale' },
          { code: 'cancellationTerms', path: 'cancellationTerms' },
          { code: 'refundTerms', path: 'refundTerms' },
        ]),
      );
    }
  });

  it('excludes drafts and enforces the Pricing singleton', () => {
    expect(
      mapPublishedPricingDocuments([{ ...validPricing(), status: 'draft' }]),
    ).toBeNull();
    expect(mapPublishedPricingDocuments([])).toBeNull();
    expect(() =>
      mapPublishedPricingDocuments([validPricing(), validPricing()]),
    ).toThrow(ContentContractError);
  });

  it('rejects missing collections and malformed document shapes', () => {
    expect(mapPricingDocument(null)).toEqual({
      ok: false,
      issues: [{ code: 'document', path: '' }],
    });

    const invalid = validPricing();
    invalid.plans = [];
    invalid.faq = [];
    const result = mapPricingDocument(invalid);
    expect(result).toMatchObject({ ok: false });
    if (!result.ok) {
      expect(result.issues).toEqual(
        expect.arrayContaining([
          { code: 'plans', path: 'plans' },
          { code: 'faq', path: 'faq' },
        ]),
      );
    }
  });

  it('rejects malformed plan cadence, recommendation and entitlement collections', () => {
    const invalid = validPricing() as unknown as {
      plans: Array<Record<string, unknown> | null>;
    };
    invalid.plans[0]!.billing = { cadence: 'week', interval: 0 };
    invalid.plans[0]!.recommended = 'yes';
    invalid.plans[0]!.entitlements = [];
    invalid.plans.push(null);

    const result = mapPricingDocument(invalid);
    expect(result).toMatchObject({ ok: false });
    if (!result.ok) {
      expect(result.issues).toEqual(
        expect.arrayContaining([
          { code: 'billing_cadence', path: 'plans.0.billing.cadence' },
          { code: 'recommended', path: 'plans.0.recommended' },
          { code: 'entitlements', path: 'plans.0.entitlements' },
          { code: 'plan', path: 'plans.2' },
        ]),
      );
    }
  });

  it('rejects duplicate plan, entitlement and FAQ presentation keys', () => {
    const invalid = validPricing();
    invalid.plans[1]!._key = invalid.plans[0]!._key;
    invalid.faq.push({ ...invalid.faq[0]! });

    const result = mapPricingDocument(invalid);
    expect(result).toMatchObject({ ok: false });
    if (!result.ok) {
      expect(result.issues).toEqual(
        expect.arrayContaining([
          { code: 'plan_key', path: 'plans' },
          { code: 'faq_key', path: 'faq' },
        ]),
      );
    }
  });
});
