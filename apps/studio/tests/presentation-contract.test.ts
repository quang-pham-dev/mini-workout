import { resolveDocumentLocations } from '../presentation.js';
import { describe, expect, it } from 'vitest';

describe('Studio Presentation locations', () => {
  it.each([
    [
      'article',
      'a-gentler-way-to-explore-mobility',
      '/articles/a-gentler-way-to-explore-mobility/',
    ],
    ['category', 'mobility', '/movement/mobility/'],
    ['campaignPage', 'autumn-mobility', '/campaigns/autumn-mobility/'],
    ['siteSettings', undefined, '/'],
    ['primaryNavigation', undefined, '/'],
  ])('maps %s to its landing route', (type, slug, href) => {
    expect(resolveDocumentLocations(type, slug)).toEqual({
      locations: [{ title: 'Landing preview', href }],
    });
  });

  it('returns an unavailable state for missing slugs and unsupported types', () => {
    expect(resolveDocumentLocations('article', undefined)).toEqual({
      message: 'Publish a valid slug before opening the preview.',
      tone: 'caution',
    });
    expect(resolveDocumentLocations('author', undefined)).toEqual({
      message: 'This document has no landing preview route.',
    });
  });
});
