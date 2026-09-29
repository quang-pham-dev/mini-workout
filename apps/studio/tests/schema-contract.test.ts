import { schemaTypes } from '../schemaTypes/index.js';
import { describe, expect, it } from 'vitest';

function arrayMemberTypes(value: unknown): unknown[] {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('of' in value) ||
    !Array.isArray(value.of)
  ) {
    return [];
  }
  return value.of.map((member) =>
    typeof member === 'object' && member !== null && 'type' in member
      ? member.type
      : undefined,
  );
}

describe('Studio schema contract', () => {
  it('registers only the approved offline Article and Category contract', () => {
    expect(schemaTypes.map((schema) => schema.name)).toEqual([
      'seoFields',
      'localMedia',
      'internalLink',
      'articleProseV1',
      'articlePullQuoteV1',
      'campaignConversionCta',
      'campaignHeroV1',
      'campaignBenefitsV1',
      'campaignFaqV1',
      'campaignCtaV1',
      'pricingConversionCta',
      'pricingBilling',
      'pricingPlan',
      'pricingFaqItem',
      'analyticsConsent',
      'category',
      'author',
      'article',
      'campaignPage',
      'pricingPage',
      'siteSettings',
      'primaryNavigation',
    ]);
  });

  it('keeps schemaVersion and lifecycle explicit on documents', () => {
    for (const documentName of [
      'category',
      'article',
      'campaignPage',
      'pricingPage',
      'siteSettings',
      'primaryNavigation',
    ]) {
      const document = schemaTypes.find(
        (schema) => schema.name === documentName,
      );
      expect(document?.type).toBe('document');
      expect(document?.fields?.map((field) => field.name)).toEqual(
        expect.arrayContaining(['schemaVersion', 'status']),
      );
    }
  });

  it('models Pricing as one structured commercial document', () => {
    const pricing = schemaTypes.find((schema) => schema.name === 'pricingPage');
    expect(pricing?.fields?.map((field) => field.name)).toEqual(
      expect.arrayContaining([
        'currencyCode',
        'currencyMinorUnit',
        'locale',
        'plans',
        'faq',
        'cancellationTerms',
        'refundTerms',
      ]),
    );
    expect(
      arrayMemberTypes(
        pricing?.fields?.find((field) => field.name === 'plans'),
      ),
    ).toEqual(['pricingPlan']);
  });

  it('allows Campaign sections only through the versioned registry', () => {
    const campaign = schemaTypes.find(
      (schema) => schema.name === 'campaignPage',
    );
    const sections = campaign?.fields?.find(
      (field) => field.name === 'sections',
    );
    expect(sections).toMatchObject({
      description:
        'Start with exactly one hero. Add at most one final conversion CTA.',
    });
    expect(arrayMemberTypes(sections)).toEqual([
      'campaignHeroV1',
      'campaignBenefitsV1',
      'campaignFaqV1',
      'campaignCtaV1',
    ]);
    expect(campaign?.fields?.map((field) => field.name)).toEqual(
      expect.arrayContaining([
        'campaignId',
        'startsAt',
        'endsAt',
        'expiryPolicy',
      ]),
    );
  });

  it('allows primary navigation to use only validated internal links', () => {
    const navigation = schemaTypes.find(
      (schema) => schema.name === 'primaryNavigation',
    );
    const links = navigation?.fields?.find((field) => field.name === 'links');
    expect(arrayMemberTypes(links)).toEqual(['internalLink']);
  });

  it('keeps consent copy optional and owned by site settings', () => {
    const settings = schemaTypes.find(
      (schema) => schema.name === 'siteSettings',
    );
    const consent = settings?.fields?.find(
      (field) => field.name === 'analyticsConsent',
    );

    expect(consent?.type).toBe('analyticsConsent');
    expect(schemaTypes.map((schema) => schema.name)).toContain(
      'analyticsConsent',
    );
  });

  it('allows Article sections only through the versioned registry', () => {
    const article = schemaTypes.find((schema) => schema.name === 'article');
    const sections = article?.fields?.find(
      (field) => field.name === 'sections',
    );
    expect(sections).not.toHaveProperty('description');
    expect(arrayMemberTypes(sections)).toEqual([
      'articleProseV1',
      'articlePullQuoteV1',
    ]);
  });

  it('derives document slugs from their real editorial title field', () => {
    const category = schemaTypes.find((schema) => schema.name === 'category');
    const article = schemaTypes.find((schema) => schema.name === 'article');
    expect(
      category?.fields?.find((field) => field.name === 'slug')?.options,
    ).toMatchObject({
      source: 'name',
    });
    expect(
      article?.fields?.find((field) => field.name === 'slug')?.options,
    ).toMatchObject({
      source: 'title',
    });
  });

  it('defines useful document preview selections', () => {
    const category = schemaTypes.find((schema) => schema.name === 'category');
    const article = schemaTypes.find((schema) => schema.name === 'article');
    const author = schemaTypes.find((schema) => schema.name === 'author');

    expect(category?.preview?.select).toMatchObject({
      title: 'name',
      subtitle: 'status',
      media: 'image.image',
    });
    expect(article?.preview?.select).toMatchObject({
      title: 'title',
      subtitle: 'category.name',
      media: 'image.image',
    });
    expect(author?.preview?.select).toMatchObject({
      title: 'name',
      subtitle: 'entityType',
    });
  });
});
