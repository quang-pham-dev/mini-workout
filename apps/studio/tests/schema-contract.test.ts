import { schemaTypes } from '../schemaTypes/index.js';
import { describe, expect, it } from 'vitest';

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
      pricing?.fields
        ?.find((field) => field.name === 'plans')
        ?.of?.map((member) => member.type),
    ).toEqual(['pricingPlan']);
  });

  it('allows Campaign sections only through the versioned registry', () => {
    const campaign = schemaTypes.find(
      (schema) => schema.name === 'campaignPage',
    );
    const sections = campaign?.fields?.find(
      (field) => field.name === 'sections',
    );
    expect(sections?.of?.map((member) => member.type)).toEqual([
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
    expect(links?.of?.map((member) => member.type)).toEqual(['internalLink']);
  });

  it('allows Article sections only through the versioned registry', () => {
    const article = schemaTypes.find((schema) => schema.name === 'article');
    const sections = article?.fields?.find(
      (field) => field.name === 'sections',
    );
    expect(sections?.of?.map((member) => member.type)).toEqual([
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
