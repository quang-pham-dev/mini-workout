import {
  ContentContractError,
  mapMarketingPageDocument,
  mapPublishedMarketingPageDocuments,
} from '../src/content/published-marketing-page.js';
import { describe, expect, it } from 'vitest';

function pageDocument(overrides: Record<string, unknown> = {}) {
  return {
    _type: 'marketingPage',
    schemaVersion: 1,
    status: 'published',
    template: 'legal.v1',
    slug: 'privacy',
    title: 'Privacy policy',
    introduction: 'How Mini Workout handles information.',
    effectiveDate: '2026-09-29',
    sections: [
      {
        _key: 'information',
        _type: 'legalSection.v1',
        heading: 'Information we collect',
        paragraphs: ['Approved legal copy.'],
      },
    ],
    seo: {
      title: 'Privacy policy | Mini Workout',
      description: 'Read the Mini Workout privacy policy.',
    },
    ...overrides,
  };
}

describe('published Marketing Page content boundary', () => {
  it('maps a legal page to a root canonical path', () => {
    expect(mapMarketingPageDocument(pageDocument())).toEqual({
      ok: true,
      value: expect.objectContaining({
        template: 'legal.v1',
        slug: 'privacy',
        effectiveDate: '2026-09-29',
        seo: expect.objectContaining({ canonicalPath: '/privacy/' }),
        sections: [
          expect.objectContaining({
            type: 'legalSection.v1',
            key: 'information',
          }),
        ],
      }),
    });
  });

  it('excludes drafts and rejects duplicate published slugs', () => {
    expect(
      mapPublishedMarketingPageDocuments([
        pageDocument({ status: 'draft' }),
        pageDocument(),
      ]),
    ).toHaveLength(1);
    expect(() =>
      mapPublishedMarketingPageDocuments([pageDocument(), pageDocument()]),
    ).toThrow(ContentContractError);
  });

  it.each([
    ['schema version', { schemaVersion: 2 }, 'schema_version'],
    ['template', { template: 'landing.v2' }, 'template'],
    ['reserved slug', { slug: 'articles' }, 'slug'],
    ['effective date', { effectiveDate: '29/09/2026' }, 'effective_date'],
    [
      'section type',
      { sections: [{ _key: 'future', _type: 'portableText.v1' }] },
      'section_type',
    ],
    [
      'paragraph',
      {
        sections: [
          {
            _key: 'copy',
            _type: 'legalSection.v1',
            heading: 'Copy',
            paragraphs: ['', 42],
          },
        ],
      },
      'paragraph',
    ],
  ])('rejects invalid %s', (_name, overrides, issue) => {
    expect(mapMarketingPageDocument(pageDocument(overrides))).toEqual({
      ok: false,
      issues: expect.arrayContaining([
        expect.objectContaining({ code: issue }),
      ]),
    });
  });

  it('rejects duplicate section keys and empty section inventory', () => {
    const section = {
      _key: 'same',
      _type: 'legalSection.v1',
      heading: 'Heading',
      paragraphs: ['Approved copy.'],
    };
    expect(
      mapMarketingPageDocument(pageDocument({ sections: [section, section] })),
    ).toEqual({
      ok: false,
      issues: expect.arrayContaining([
        expect.objectContaining({ code: 'section_key' }),
      ]),
    });
    expect(mapMarketingPageDocument(pageDocument({ sections: [] }))).toEqual({
      ok: false,
      issues: expect.arrayContaining([
        expect.objectContaining({ code: 'sections' }),
      ]),
    });
  });
});
