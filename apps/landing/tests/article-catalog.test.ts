import {
  getArticleBySlug,
  getPublishedArticlePaths,
  getPublishedArticlesForCategory,
} from '../src/features/articles/catalog.js';
import { describe, expect, it } from 'vitest';

describe('article catalog', () => {
  it('returns the published Mobility field note as a stable view model', () => {
    expect(getArticleBySlug('a-gentler-way-to-explore-mobility')).toMatchObject(
      {
        slug: 'a-gentler-way-to-explore-mobility',
        status: 'published',
        categorySlug: 'mobility',
        seo: {
          canonicalPath: '/articles/a-gentler-way-to-explore-mobility/',
        },
      },
    );
  });

  it('exposes only published paths and category relationships', () => {
    expect(getPublishedArticlePaths()).toEqual([
      '/articles/a-gentler-way-to-explore-mobility/',
    ]);
    expect(getPublishedArticlesForCategory('mobility')).toHaveLength(1);
    expect(getPublishedArticlesForCategory('strength')).toEqual([]);
    expect(getArticleBySlug('draft-note')).toBeUndefined();
  });
});
