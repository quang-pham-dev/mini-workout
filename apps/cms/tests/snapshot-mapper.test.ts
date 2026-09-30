import {
  SnapshotMappingError,
  normalizeArticleDocument,
  normalizeCampaignDocument,
  normalizePricingDocument,
} from '../src/api/landing/services/snapshot-mapper';
import { describe, expect, it } from 'vitest';

const media = {
  id: 1,
  alt: 'A gentle mobility pose',
  caption: 'Move within a comfortable range.',
  image: {
    url: 'https://media.example.com/mobility.webp',
    width: 1600,
    height: 900,
  },
};

describe('Strapi snapshot mapper', () => {
  it('normalizes an Article document into the existing Landing contract', () => {
    expect(
      normalizeArticleDocument({
        schemaVersion: 1,
        slug: 'a-gentler-way-to-explore-mobility',
        title: 'A gentler way to explore mobility',
        dek: 'Small ranges can still create useful movement.',
        category: { slug: 'mobility', name: 'Mobility' },
        author: { name: 'Mini Workout', entityType: 'Organization' },
        image: media,
        sections: [
          {
            id: 7,
            __component: 'article.prose-v1',
            heading: 'Start where you are',
            paragraphs: ['Notice the range you have today.'],
          },
          {
            id: 8,
            __component: 'article.pull-quote-v1',
            quote: 'Comfort is useful feedback.',
          },
        ],
        seo: {
          title: 'Gentle mobility',
          description: 'Explore mobility gently.',
        },
      }),
    ).toMatchObject({
      _type: 'article',
      status: 'published',
      sections: [
        { _key: '7', _type: 'prose.v1' },
        { _key: '8', _type: 'pullQuote.v1' },
      ],
      image: {
        src: 'https://media.example.com/mobility.webp',
        width: 1600,
        height: 900,
      },
    });
  });

  it('normalizes versioned Campaign dynamic-zone sections', () => {
    expect(
      normalizeCampaignDocument({
        schemaVersion: 1,
        campaignId: 'mobility-reset',
        slug: 'mobility-reset',
        title: 'Mobility reset',
        audienceDescription: 'For people returning to daily movement.',
        startsAt: '2026-09-01T00:00:00.000Z',
        endsAt: '2026-10-01T00:00:00.000Z',
        expiryPolicy: { mode: 'gone' },
        sections: [
          {
            id: 11,
            __component: 'campaign.hero-v1',
            eyebrow: 'Mobility',
            headline: 'Make room to move',
            introduction: 'A calm, practical reset.',
            image: media,
            cta: { label: 'Start now', action: 'register' },
          },
          {
            id: 12,
            __component: 'campaign.benefits-v1',
            heading: 'What you will practice',
            items: [
              { id: 13, title: 'Control', description: 'Own a useful range.' },
            ],
          },
        ],
        seo: {
          title: 'Mobility reset',
          description: 'A practical mobility reset.',
        },
      }),
    ).toMatchObject({
      _type: 'campaignPage',
      status: 'published',
      sections: [
        { _key: '11', _type: 'campaignHero.v1' },
        {
          _key: '12',
          _type: 'campaignBenefits.v1',
          items: [{ _key: '13' }],
        },
      ],
    });
  });

  it('fails closed for an unknown Dynamic Zone component', () => {
    expect(() =>
      normalizeArticleDocument({
        schemaVersion: 1,
        slug: 'article',
        title: 'Article',
        dek: 'Dek',
        category: { slug: 'mobility', name: 'Mobility' },
        author: { name: 'Mini Workout', entityType: 'Organization' },
        image: media,
        sections: [{ id: 1, __component: 'article.future-v2' }],
        seo: { title: 'Article', description: 'Article description' },
      }),
    ).toThrowError(SnapshotMappingError);
  });

  it('publishes only pricing plans enabled by Product', () => {
    const pricing = normalizePricingDocument({
      schemaVersion: 1,
      title: 'Plans',
      introduction: 'Choose a plan.',
      currencyCode: 'USD',
      currencyMinorUnit: 2,
      locale: 'en-US',
      plans: [
        pricingPlan({ id: 1, planId: 'monthly', enabled: true }),
        pricingPlan({ id: 2, planId: 'paused', enabled: false }),
      ],
      faq: [{ id: 3, question: 'Can I cancel?', answer: 'Yes.' }],
      cancellationTerms: 'Cancel from your account.',
      refundTerms: 'See the approved refund policy.',
      seo: { title: 'Pricing', description: 'Mini Workout pricing.' },
    });

    expect(pricing.plans).toHaveLength(1);
    expect(pricing.plans).toMatchObject([{ planId: 'monthly' }]);
  });

  it('fails closed when Product disables every pricing plan', () => {
    expect(() =>
      normalizePricingDocument({
        schemaVersion: 1,
        title: 'Plans',
        introduction: 'Choose a plan.',
        currencyCode: 'USD',
        currencyMinorUnit: 2,
        locale: 'en-US',
        plans: [pricingPlan({ id: 1, planId: 'paused', enabled: false })],
        faq: [{ id: 3, question: 'Can I cancel?', answer: 'Yes.' }],
        cancellationTerms: 'Cancel from your account.',
        refundTerms: 'See the approved refund policy.',
        seo: { title: 'Pricing', description: 'Mini Workout pricing.' },
      }),
    ).toThrow('Expected at least one enabled pricing plan');
  });
});

function pricingPlan(input: { id: number; planId: string; enabled: boolean }) {
  return {
    ...input,
    name: input.planId,
    summary: 'A product-approved plan.',
    amountMinor: 1000,
    billing: { cadence: 'month', interval: 1 },
    entitlements: [{ id: input.id + 10, label: 'Daily movement' }],
    cta: { label: 'Start', action: 'register' },
    recommended: false,
  };
}
