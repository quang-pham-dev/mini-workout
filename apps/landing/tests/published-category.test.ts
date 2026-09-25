import {
  ContentContractError,
  mapCategoryDocument,
  mapPublishedCategoryDocuments,
} from '../src/content/published-category.js';
import { describe, expect, it } from 'vitest';

function categoryDocument(overrides: Record<string, unknown> = {}) {
  return {
    _type: 'category',
    schemaVersion: 1,
    status: 'published',
    slug: 'mobility',
    name: 'Mobility',
    eyebrow: 'Everyday mobility',
    headline: 'Move with more room.',
    introduction: 'Explore movement with attention.',
    backlink: { label: 'Ways to move', href: '/#ways-to-move' },
    image: {
      src: '/images/home/mobility-stretch.webp',
      alt: 'A person stretching at home.',
      width: 1122,
      height: 1402,
      caption: 'Notice how you want to move today.',
    },
    focusHeading: 'Start where you feel it',
    focusIntroduction: 'Choose an area to explore.',
    focuses: [
      {
        _key: 'upper-body',
        title: 'Shoulders & upper body',
        description: 'Explore reaching and circling movements.',
      },
    ],
    closingHeading: 'Find a rhythm you can return to.',
    closingCopy: 'Shape a weekly routine around your starting point.',
    seo: {
      title: 'Mobility exercises | Mini Workout',
      description: 'Explore approachable mobility exercises.',
    },
    ...overrides,
  };
}

describe('published Category content boundary', () => {
  it('maps a schema v1 Category and derives its canonical path', () => {
    expect(mapCategoryDocument(categoryDocument())).toEqual({
      ok: true,
      value: expect.objectContaining({
        slug: 'mobility',
        status: 'published',
        backlink: { label: 'Ways to move', href: '/#ways-to-move' },
        focuses: [expect.objectContaining({ key: 'upper-body' })],
        seo: expect.objectContaining({
          canonicalPath: '/movement/mobility/',
        }),
      }),
    });
  });

  it('excludes drafts from the published collection', () => {
    expect(
      mapPublishedCategoryDocuments([
        categoryDocument({ status: 'draft' }),
        categoryDocument(),
      ]),
    ).toHaveLength(1);
  });

  it.each([
    ['unknown schema', { schemaVersion: 2 }, 'schema_version'],
    ['invalid slug', { slug: '../mobility' }, 'slug'],
    [
      'unsafe backlink',
      { backlink: { label: 'Ways to move', href: '//evil.example' } },
      'internal_link_href',
    ],
    [
      'unsafe media',
      {
        image: {
          src: 'https://evil.example/image.webp',
          alt: 'Remote image.',
          width: 100,
          height: 100,
          caption: 'Remote.',
        },
      },
      'media_src',
    ],
    ['missing SEO title', { seo: { description: 'Description.' } }, 'title'],
    ['empty focuses', { focuses: [] }, 'focuses'],
  ])('rejects %s', (_name, overrides, expectedIssue) => {
    const result = mapCategoryDocument(categoryDocument(overrides));
    expect(result).toEqual({
      ok: false,
      issues: expect.arrayContaining([
        expect.objectContaining({ code: expectedIssue }),
      ]),
    });
  });

  it('fails the build for malformed published Categories', () => {
    expect(() =>
      mapPublishedCategoryDocuments([categoryDocument({ headline: '' })]),
    ).toThrow(ContentContractError);
  });

  it('fails closed for unknown lifecycle states and duplicate slugs', () => {
    expect(() =>
      mapPublishedCategoryDocuments([categoryDocument({ status: 'publshed' })]),
    ).toThrow(ContentContractError);
    expect(() =>
      mapPublishedCategoryDocuments([categoryDocument(), categoryDocument()]),
    ).toThrow(ContentContractError);
  });
});
