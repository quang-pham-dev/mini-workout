import {
  validateCampaignExpiryPolicy,
  validateCampaignSchedule,
  validateInternalHref,
  validatePricingDocument,
  validateSlug,
} from '../schemaTypes/validation.js';
import { editorialDeskGroups, singletonDocumentTypes } from '../structure.js';
import { describe, expect, it } from 'vitest';

describe('Studio authoring contract', () => {
  it('organizes editorial types and explicit configuration singletons', () => {
    expect(editorialDeskGroups).toEqual([
      {
        title: 'Editorial',
        documentTypes: ['article', 'category', 'campaignPage'],
      },
      { title: 'People', documentTypes: ['author'] },
    ]);
    expect(singletonDocumentTypes).toEqual([
      'siteSettings',
      'primaryNavigation',
      'pricingPage',
    ]);
  });

  it('validates Pricing money, cadence and recommendation invariants', () => {
    const valid = {
      title: 'Choose the support that fits',
      introduction: 'Compare approved plans.',
      currencyCode: 'USD',
      currencyMinorUnit: 2,
      locale: 'en-US',
      plans: [
        {
          _key: 'monthly',
          planId: 'monthly',
          name: 'Monthly',
          summary: 'Recurring access.',
          amountMinor: 1200,
          billing: { cadence: 'month', interval: 1 },
          entitlements: [{ _key: 'library', label: 'Movement library' }],
          cta: { label: 'Build my routine', action: 'register' },
          recommended: true,
        },
        {
          _key: 'lifetime',
          planId: 'lifetime',
          name: 'Lifetime',
          summary: 'One-time access.',
          amountMinor: 9900,
          billing: { cadence: 'one_time' },
          entitlements: [{ _key: 'library', label: 'Movement library' }],
          cta: { label: 'Build my routine', action: 'register' },
          recommended: false,
        },
      ],
      faq: [{ _key: 'change', question: 'Can I change?', answer: 'Yes.' }],
      cancellationTerms: 'Approved cancellation terms.',
      refundTerms: 'Approved refund terms.',
    };

    expect(validatePricingDocument(valid)).toBe(true);
    expect(
      validatePricingDocument({
        ...valid,
        plans: [valid.plans[0], { ...valid.plans[0], recommended: true }],
      }),
    ).toBe(false);
    expect(
      validatePricingDocument({
        ...valid,
        plans: [
          {
            ...valid.plans[0],
            amountMinor: 12.5,
            billing: { cadence: 'one_time', interval: 1 },
          },
        ],
      }),
    ).toBe(false);
    expect(validatePricingDocument({ ...valid, currencyMinorUnit: 0 })).toBe(
      false,
    );
    expect(
      validatePricingDocument({
        ...valid,
        cancellationTerms: '',
        faq: [],
      }),
    ).toBe(false);
    expect(
      validatePricingDocument({
        ...valid,
        plans: [
          {
            ...valid.plans[0],
            cta: { label: 'Continue', action: 'checkout' },
            entitlements: [
              { _key: 'library', label: 'Library' },
              { _key: 'library', label: 'Duplicate' },
            ],
          },
        ],
      }),
    ).toBe(false);
    expect(
      validatePricingDocument({
        ...valid,
        faq: [valid.faq[0], { ...valid.faq[0], question: 'Duplicate key' }],
      }),
    ).toBe(false);
  });

  it.each([
    ['mobility', true],
    [{ current: 'mobility' }, true],
    ['a-gentler-way-to-explore-mobility', true],
    [{ current: 42 }, false],
    ['Mobility', false],
    ['mobility--daily', false],
    ['../mobility', false],
    ['', false],
  ])('validates normalized slug %j', (value, expected) => {
    expect(validateSlug(value)).toBe(expected);
  });

  it.each([
    ['/', true],
    ['/#ways-to-move', true],
    ['/movement/mobility/', true],
    ['/movement#daily-range', true],
    ['/movement#42-range', false],
    ['/movement#daily#range', false],
    ['/movement?category=mobility', false],
    ['//example.com', false],
    ['/../admin', false],
    ['/movement\\mobility', false],
    ['https://example.com', false],
    [undefined, false],
  ])('validates safe internal href %j', (value, expected) => {
    expect(validateInternalHref(value)).toBe(expected);
  });

  it('validates Campaign schedule and expiry policy as one document contract', () => {
    expect(
      validateCampaignSchedule({
        startsAt: '2026-09-01T00:00:00.000Z',
        endsAt: '2026-10-01T00:00:00.000Z',
      }),
    ).toBe(true);
    expect(
      validateCampaignSchedule({
        startsAt: '2026-10-01T00:00:00.000Z',
        endsAt: '2026-09-01T00:00:00.000Z',
      }),
    ).toBe(false);
    expect(validateCampaignExpiryPolicy({ mode: 'gone' })).toBe(true);
    expect(
      validateCampaignExpiryPolicy({
        mode: 'redirect',
        successor: { label: 'Continue', href: '/movement/mobility/' },
      }),
    ).toBe(true);
    expect(validateCampaignExpiryPolicy({ mode: 'redirect' })).toBe(false);
    expect(
      validateCampaignExpiryPolicy({
        mode: 'archive',
        successor: { label: 'Stale', href: '/movement/mobility/' },
      }),
    ).toBe(false);
  });
});
