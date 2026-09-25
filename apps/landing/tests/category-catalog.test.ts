import {
  getCategoryBySlug,
  getPublishedCategoryPaths,
} from '../src/features/categories/catalog.js';
import { describe, expect, it } from 'vitest';

describe('category catalog', () => {
  it('returns the published Mobility category as a stable view model', () => {
    expect(getCategoryBySlug('mobility')).toMatchObject({
      slug: 'mobility',
      name: 'Mobility',
      status: 'published',
      seo: {
        canonicalPath: '/movement/mobility/',
      },
    });
  });

  it('exposes only published category paths for static generation and sitemap membership', () => {
    expect(getPublishedCategoryPaths()).toEqual(['/movement/mobility/']);
    expect(getCategoryBySlug('strength')).toBeUndefined();
  });
});
