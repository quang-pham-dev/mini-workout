import { createStrapiImportPlan } from '../src/migration/import-plan';
import { describe, expect, it } from 'vitest';

function manifest() {
  const base = { schemaVersion: 1, status: 'published' } as const;
  return {
    schemaVersion: 1,
    generatedAt: '2026-09-30T08:00:00.000Z',
    source: { provider: 'fixtures', revision: 'fixture-v1' },
    articles: [
      {
        ...base,
        _type: 'article',
        slug: 'article',
        author: { name: 'Editorial', type: 'Organization' },
        category: { slug: 'mobility', name: 'Mobility' },
        image: {
          src: '/article.webp',
          alt: 'Article',
          width: 10,
          height: 10,
        },
      },
    ],
    categories: [
      {
        ...base,
        _type: 'category',
        slug: 'mobility',
        image: {
          src: '/category.webp',
          alt: 'Category',
          width: 10,
          height: 10,
        },
      },
    ],
    campaigns: [],
    marketingPages: [],
    pricing: null,
    siteSettings: { ...base, _type: 'siteSettings' },
    primaryNavigation: { ...base, _type: 'primaryNavigation' },
  };
}

describe('Strapi migration import plan', () => {
  it('orders identities and media before related documents and singletons last', () => {
    const plan = createStrapiImportPlan(manifest());
    const summary = plan.operations.map(
      ({ phase, kind, key }) => `${phase}:${kind}:${key}`,
    );

    expect(summary).toEqual([
      '1:author:Editorial',
      '1:media:/article.webp',
      '1:media:/category.webp',
      '2:category:mobility',
      '3:article:article',
      '4:primary-navigation:primary-navigation',
      '4:site-settings:site-settings',
    ]);
    expect(
      plan.operations.find(({ kind }) => kind === 'article')?.references,
    ).toEqual(['author:Editorial', 'category:mobility', 'media:/article.webp']);
  });

  it('reports deterministic blockers instead of producing an unsafe apply plan', () => {
    const first = createStrapiImportPlan(manifest());
    const second = createStrapiImportPlan(manifest());

    expect(first.readyToApply).toBe(false);
    expect(first.blockers).toEqual([
      { code: 'REQUIRED_PRICING_MISSING', path: 'pricing' },
      { code: 'MEDIA_BINARY_REQUIRED', path: '/article.webp' },
      { code: 'MEDIA_BINARY_REQUIRED', path: '/category.webp' },
    ]);
    expect(first.planRevision).toBe(second.planRevision);
  });
});
