import { comparePublishedContentSnapshots } from '../src/content/content-parity.js';
import { getPublishedArticles } from '../src/features/articles/catalog.js';
import { getPublishedCampaigns } from '../src/features/campaigns/catalog.js';
import { getPublishedCategories } from '../src/features/categories/catalog.js';
import { getPublishedPricing } from '../src/features/pricing/catalog.js';
import { getPublishedSiteShell } from '../src/features/site-shell/catalog.js';
import { describe, expect, it } from 'vitest';

const fixtureSnapshot = () => ({
  articles: structuredClone(getPublishedArticles()),
  campaigns: structuredClone(getPublishedCampaigns()),
  categories: structuredClone(getPublishedCategories()),
  pricing: structuredClone(getPublishedPricing()),
  siteShell: structuredClone(getPublishedSiteShell()),
});

describe('published content parity', () => {
  it('accepts equivalent snapshots', () => {
    const expected = fixtureSnapshot();

    expect(
      comparePublishedContentSnapshots(expected, structuredClone(expected)),
    ).toEqual({ ok: true, issues: [] });
  });

  it('reports stable site-shell paths without exposing content values', () => {
    const expected = fixtureSnapshot();
    const actual = fixtureSnapshot();
    actual.siteShell.brandName = 'Changed';
    actual.siteShell.primaryLinks[0]!.href = '/changed';
    actual.siteShell.signInLabel = 'Changed';

    expect(comparePublishedContentSnapshots(expected, actual)).toEqual({
      ok: false,
      issues: [
        { code: 'SITE_SETTINGS', path: 'siteShell.brandName' },
        { code: 'PRIMARY_NAVIGATION', path: 'siteShell.primaryLinks' },
        { code: 'PRIMARY_NAVIGATION', path: 'siteShell.signInLabel' },
      ],
    });
  });

  it('reports route inventory differences without exposing content values', () => {
    const expected = fixtureSnapshot();
    const actual = fixtureSnapshot();
    actual.articles = [];
    actual.categories[0]!.slug = 'unexpected';

    expect(comparePublishedContentSnapshots(expected, actual)).toEqual({
      ok: false,
      issues: [
        {
          code: 'ARTICLE_INVENTORY',
          path: 'articles.a-gentler-way-to-explore-mobility.missing',
        },
        {
          code: 'CATEGORY_INVENTORY',
          path: 'categories.mobility.missing',
        },
        {
          code: 'CATEGORY_INVENTORY',
          path: 'categories.unexpected.unexpected',
        },
      ],
    });
  });

  it('reports Pricing activation without exposing commercial values', () => {
    const expected = fixtureSnapshot();
    const actual = fixtureSnapshot();
    actual.pricing = {
      status: 'published',
      title: 'Changed',
      introduction: 'Changed',
      currencyCode: 'USD',
      currencyMinorUnit: 2,
      locale: 'en-US',
      plans: [],
      faq: [],
      cancellationTerms: 'Changed',
      refundTerms: 'Changed',
      seo: {
        title: 'Changed',
        description: 'Changed',
        canonicalPath: '/pricing/',
      },
    };

    expect(comparePublishedContentSnapshots(expected, actual)).toEqual({
      ok: false,
      issues: [{ code: 'PRICING_INVENTORY', path: 'pricing.unexpected' }],
    });
  });

  it('reports SEO, canonical, relationship, section and media drift', () => {
    const expected = fixtureSnapshot();
    const actual = fixtureSnapshot();
    const article = actual.articles[0]!;
    const category = actual.categories[0]!;

    article.seo.title = 'Changed';
    article.seo.canonicalPath = '/articles/changed/';
    article.categorySlug = 'changed';
    article.sections = [...article.sections].reverse();
    article.image.width += 1;
    category.seo.description = 'Changed';
    category.seo.canonicalPath = '/movement/changed/';
    category.image.height += 1;

    expect(comparePublishedContentSnapshots(expected, actual)).toEqual({
      ok: false,
      issues: [
        {
          code: 'ARTICLE_CANONICAL',
          path: 'articles.a-gentler-way-to-explore-mobility.canonical',
        },
        {
          code: 'ARTICLE_RELATIONSHIP',
          path: 'articles.a-gentler-way-to-explore-mobility.category',
        },
        {
          code: 'ARTICLE_MEDIA_DIMENSIONS',
          path: 'articles.a-gentler-way-to-explore-mobility.image.dimensions',
        },
        {
          code: 'ARTICLE_SECTION_ORDER',
          path: 'articles.a-gentler-way-to-explore-mobility.sections',
        },
        {
          code: 'ARTICLE_SEO',
          path: 'articles.a-gentler-way-to-explore-mobility.seo',
        },
        {
          code: 'CATEGORY_CANONICAL',
          path: 'categories.mobility.canonical',
        },
        {
          code: 'CATEGORY_MEDIA_DIMENSIONS',
          path: 'categories.mobility.image.dimensions',
        },
        {
          code: 'CATEGORY_SEO',
          path: 'categories.mobility.seo',
        },
      ],
    });
  });
});
