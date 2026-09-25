import {
  baselineDocumentIds,
  createBaselineDocuments,
  legacyPrivateBaselineDocumentIds,
} from '../scripts/baseline-manifest.mjs';
import { describe, expect, it } from 'vitest';

describe('Studio baseline seed manifest', () => {
  it('uses stable IDs and published schema-v1 documents', () => {
    expect(baselineDocumentIds).toEqual([
      'mini-workout-author-editorial',
      'mini-workout-category-mobility',
      'mini-workout-article-a-gentler-way-to-explore-mobility',
      'mini-workout-site-settings',
      'mini-workout-primary-navigation',
    ]);
    expect(baselineDocumentIds.every((id) => !id.includes('.'))).toBe(true);
    expect(
      legacyPrivateBaselineDocumentIds.every((id) => id.includes('.')),
    ).toBe(true);

    const documents = createBaselineDocuments({
      articleImageAssetId: 'image-article',
      categoryImageAssetId: 'image-category',
    });
    expect(documents.map(({ _id, _type }) => ({ _id, _type }))).toEqual([
      { _id: baselineDocumentIds[0], _type: 'author' },
      { _id: baselineDocumentIds[1], _type: 'category' },
      { _id: baselineDocumentIds[2], _type: 'article' },
      { _id: baselineDocumentIds[3], _type: 'siteSettings' },
      { _id: baselineDocumentIds[4], _type: 'primaryNavigation' },
    ]);
    expect(documents.slice(1)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ schemaVersion: 1, status: 'published' }),
      ]),
    );
  });

  it('connects document and image references without weak references', () => {
    const [, category, article] = createBaselineDocuments({
      articleImageAssetId: 'image-article',
      categoryImageAssetId: 'image-category',
    });

    expect(category.image.image.asset).toEqual({
      _type: 'reference',
      _ref: 'image-category',
    });
    expect(article.image.image.asset).toEqual({
      _type: 'reference',
      _ref: 'image-article',
    });
    expect(article.category).toEqual({
      _type: 'reference',
      _ref: baselineDocumentIds[1],
    });
    expect(article.author).toEqual({
      _type: 'reference',
      _ref: baselineDocumentIds[0],
    });
  });
});
