import {
  ContentContractError,
  mapArticleDocument,
  mapPublishedArticleDocuments,
} from '../src/content/published-article.js';
import { articleSectionKinds } from '../src/content/section-registry.js';
import { describe, expect, it } from 'vitest';

function articleDocument(overrides: Record<string, unknown> = {}) {
  return {
    _type: 'article',
    schemaVersion: 1,
    status: 'published',
    slug: 'move-with-room',
    category: { slug: 'mobility', name: 'Mobility' },
    title: 'Move with room',
    dek: 'A quieter way to explore movement.',
    author: { name: 'Mini Workout editorial', type: 'Organization' },
    image: {
      src: '/images/articles/mobility-range.webp',
      alt: 'A person moving at home.',
      width: 1536,
      height: 1024,
      caption: 'Start where you are.',
    },
    sections: [
      {
        _key: 'range',
        _type: 'prose.v1',
        heading: 'Range is not a score',
        paragraphs: ['Notice what is available today.'],
      },
      {
        _key: 'choice',
        _type: 'pullQuote.v1',
        quote: 'Let movement leave room for choice.',
      },
    ],
    seo: {
      title: 'Move with room | Mini Workout',
      description: 'Explore an attentive approach to everyday mobility.',
    },
    ...overrides,
  };
}

describe('published Article content boundary', () => {
  it('maps a schema v1 document into a canonical static view model', () => {
    expect(mapArticleDocument(articleDocument())).toEqual({
      ok: true,
      value: expect.objectContaining({
        slug: 'move-with-room',
        status: 'published',
        sections: [
          expect.objectContaining({ type: 'prose.v1', key: 'range' }),
          expect.objectContaining({ type: 'pullQuote.v1', key: 'choice' }),
        ],
        seo: expect.objectContaining({
          canonicalPath: '/articles/move-with-room/',
        }),
      }),
    });
  });

  it('keeps the versioned section registry explicit', () => {
    expect(articleSectionKinds).toEqual(['prose.v1', 'pullQuote.v1']);
  });

  it('rejects non-document input at the boundary', () => {
    expect(mapArticleDocument(null)).toEqual({
      ok: false,
      issues: [{ code: 'document', path: '' }],
    });
  });

  it('excludes drafts from the published collection', () => {
    expect(
      mapPublishedArticleDocuments([
        articleDocument({ status: 'draft' }),
        articleDocument(),
      ]),
    ).toHaveLength(1);
  });

  it.each([
    ['unknown schema version', { schemaVersion: 2 }, 'schema_version'],
    [
      'unknown section version',
      { sections: [{ _key: 'future', _type: 'gallery.v2' }] },
      'section_type',
    ],
    [
      'unsafe media protocol',
      {
        image: {
          src: 'javascript:alert(1)',
          alt: 'Unsafe image.',
          width: 10,
          height: 10,
          caption: 'Unsafe.',
        },
      },
      'media_src',
    ],
    ['invalid slug', { slug: '../preview' }, 'slug'],
  ])('rejects %s', (_name, overrides, expectedIssue) => {
    const result = mapArticleDocument(articleDocument(overrides));

    expect(result).toEqual({
      ok: false,
      issues: expect.arrayContaining([
        expect.objectContaining({ code: expectedIssue }),
      ]),
    });
  });

  it('fails closed when a malformed published document enters a build', () => {
    expect(() =>
      mapPublishedArticleDocuments([articleDocument({ title: '' })]),
    ).toThrow(ContentContractError);
  });

  it('rejects duplicate section keys and malformed paragraph values', () => {
    const result = mapArticleDocument(
      articleDocument({
        sections: [
          {
            _key: 'repeated',
            _type: 'prose.v1',
            heading: 'First section',
            paragraphs: ['Useful copy.'],
          },
          {
            _key: 'repeated',
            _type: 'prose.v1',
            heading: 'Second section',
            paragraphs: ['', 42],
          },
        ],
      }),
    );

    expect(result).toEqual({
      ok: false,
      issues: expect.arrayContaining([
        expect.objectContaining({ code: 'paragraph' }),
        expect.objectContaining({ code: 'section_key' }),
      ]),
    });
  });

  it('fails closed for unknown lifecycle states and duplicate slugs', () => {
    expect(() =>
      mapPublishedArticleDocuments([articleDocument({ status: 'publshed' })]),
    ).toThrow(ContentContractError);
    expect(() =>
      mapPublishedArticleDocuments([articleDocument(), articleDocument()]),
    ).toThrow(ContentContractError);
  });
});
