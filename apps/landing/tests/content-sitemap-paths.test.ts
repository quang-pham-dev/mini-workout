import { createIndexablePaths } from '../src/content/sitemap-paths.js';
import { describe, expect, it } from 'vitest';

describe('published sitemap paths', () => {
  it('includes Pricing only when a published Pricing canonical exists', () => {
    const shared = {
      campaignPaths: [],
      categoryPaths: ['/movement/mobility/'],
      articlePaths: ['/articles/gentle-mobility/'],
      marketingPagePaths: [],
    };

    expect(
      createIndexablePaths({ ...shared, pricingPath: '/pricing/' }),
    ).toEqual([
      '/',
      '/pricing/',
      '/movement/mobility/',
      '/articles/gentle-mobility/',
    ]);
    expect(createIndexablePaths({ ...shared, pricingPath: null })).toEqual([
      '/',
      '/movement/mobility/',
      '/articles/gentle-mobility/',
    ]);
  });
});
