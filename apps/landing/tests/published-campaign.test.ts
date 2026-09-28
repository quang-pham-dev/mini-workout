import {
  classifyCampaignLifecycle,
  mapCampaignDocument,
  mapPublishedCampaignDocuments,
} from '../src/content/published-campaign.js';
import { ContentContractError } from '../src/content/validation-primitives.js';
import { describe, expect, it } from 'vitest';

function validCampaign() {
  return {
    _type: 'campaignPage',
    schemaVersion: 1,
    status: 'published',
    campaignId: 'mobility-autumn-2026',
    slug: 'mobility-autumn',
    title: 'Autumn mobility',
    audienceDescription: 'Adults exploring approachable everyday movement.',
    startsAt: '2026-09-01T00:00:00.000Z',
    endsAt: '2026-10-01T00:00:00.000Z',
    expiryPolicy: { mode: 'gone' },
    sections: [
      {
        _key: 'hero',
        _type: 'campaignHero.v1',
        eyebrow: 'Seasonal movement',
        headline: 'Make room to move this autumn.',
        introduction: 'A focused collection for everyday mobility.',
        image: {
          src: '/images/home/mobility-stretch.webp',
          alt: 'A person stretching on a mat.',
          width: 1122,
          height: 1402,
          caption: 'Move at a pace that feels useful today.',
        },
        cta: { label: 'Build my routine', action: 'register' },
      },
      {
        _key: 'benefits',
        _type: 'campaignBenefits.v1',
        heading: 'What you can explore',
        items: [
          {
            _key: 'range',
            title: 'Comfortable range',
            description: 'Choose movements that suit where you are today.',
          },
        ],
      },
      {
        _key: 'faq',
        _type: 'campaignFaq.v1',
        heading: 'Before you begin',
        items: [
          {
            _key: 'pace',
            question: 'Can I choose my own pace?',
            answer: 'Yes. Start with a range that feels comfortable.',
          },
        ],
      },
      {
        _key: 'closing',
        _type: 'campaignCta.v1',
        heading: 'Build a routine you can return to.',
        copy: 'Choose your focus, level and weekly rhythm.',
        cta: { label: 'Build my routine', action: 'register' },
      },
    ],
    seo: {
      title: 'Autumn mobility | Mini Workout',
      description: 'Explore an approachable seasonal mobility collection.',
    },
  };
}

describe('published Campaign content contract', () => {
  it('maps the constrained v1 contract and derives its canonical path', () => {
    const result = mapCampaignDocument(validCampaign());

    expect(result).toMatchObject({
      ok: true,
      value: {
        campaignId: 'mobility-autumn-2026',
        slug: 'mobility-autumn',
        expiryPolicy: { mode: 'gone' },
        sections: [
          expect.objectContaining({
            type: 'campaignHero.v1',
            cta: { label: 'Build my routine', action: 'register' },
          }),
          expect.anything(),
          expect.anything(),
          expect.anything(),
        ],
        seo: { canonicalPath: '/campaigns/mobility-autumn/' },
      },
    });
    if (result.ok) {
      expect(result.value.sections.map(({ type }) => type)).toEqual([
        'campaignHero.v1',
        'campaignBenefits.v1',
        'campaignFaq.v1',
        'campaignCta.v1',
      ]);
    }
  });

  it('derives lifecycle deterministically at schedule boundaries', () => {
    const result = mapCampaignDocument(validCampaign());
    if (!result.ok) throw new Error('fixture must be valid');

    expect(
      classifyCampaignLifecycle(
        result.value,
        new Date('2026-08-31T23:59:59.999Z'),
      ),
    ).toBe('scheduled');
    expect(
      classifyCampaignLifecycle(
        result.value,
        new Date('2026-09-01T00:00:00.000Z'),
      ),
    ).toBe('active');
    expect(
      classifyCampaignLifecycle(
        result.value,
        new Date('2026-10-01T00:00:00.000Z'),
      ),
    ).toBe('expired');
  });

  it('requires ordered UTC dates and an explicit consistent expiry policy', () => {
    const invalid = validCampaign();
    invalid.startsAt = '2026-10-01T00:00:00.000Z';
    invalid.endsAt = '2026-09-01T00:00:00.000Z';
    invalid.expiryPolicy = {
      mode: 'redirect',
    } as typeof invalid.expiryPolicy;

    const result = mapCampaignDocument(invalid);
    expect(result).toMatchObject({ ok: false });
    if (!result.ok) {
      expect(result.issues).toEqual(
        expect.arrayContaining([
          { code: 'campaign_schedule', path: 'startsAt' },
          { code: 'expiry_successor', path: 'expiryPolicy.successor' },
        ]),
      );
    }
  });

  it('rejects unknown sections, unsafe redirects and duplicate section keys', () => {
    const invalid = validCampaign();
    invalid.expiryPolicy = {
      mode: 'redirect',
      successor: { label: 'Continue', href: 'https://evil.example/' },
    } as typeof invalid.expiryPolicy;
    invalid.sections[0]!.cta = {
      label: 'Unsafe destination',
      action: 'open',
    };
    invalid.sections = [
      invalid.sections[0]!,
      { ...invalid.sections[0]!, _type: 'freeFormHtml.v1' },
    ] as typeof invalid.sections;

    const result = mapCampaignDocument(invalid);
    expect(result).toMatchObject({ ok: false });
    if (!result.ok) {
      expect(result.issues).toEqual(
        expect.arrayContaining([
          { code: 'internal_link_href', path: 'expiryPolicy.successor.href' },
          { code: 'conversion_action', path: 'sections.0.cta.action' },
          { code: 'section_type', path: 'sections.1._type' },
          { code: 'section_key', path: 'sections' },
        ]),
      );
    }
  });

  it('requires exactly one leading hero and at most one closing CTA', () => {
    const invalid = validCampaign();
    invalid.sections = [
      invalid.sections[1]!,
      invalid.sections[0]!,
      invalid.sections[3]!,
      { ...invalid.sections[3]!, _key: 'another-closing' },
    ] as typeof invalid.sections;

    const result = mapCampaignDocument(invalid);
    expect(result).toMatchObject({ ok: false });
    if (!result.ok) {
      expect(result.issues).toEqual(
        expect.arrayContaining([
          { code: 'campaign_hero', path: 'sections' },
          { code: 'campaign_cta', path: 'sections' },
        ]),
      );
    }
  });

  it('excludes drafts and rejects duplicate public identifiers', () => {
    const draft = { ...validCampaign(), status: 'draft' };
    expect(mapPublishedCampaignDocuments([draft])).toEqual([]);

    expect(() =>
      mapPublishedCampaignDocuments([validCampaign(), validCampaign()]),
    ).toThrow(ContentContractError);
  });
});
