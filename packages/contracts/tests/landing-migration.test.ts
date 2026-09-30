import { landingMigrationManifestV1Schema } from '../src/landing-migration.js';
import { describe, expect, it } from 'vitest';

const document = (_type: string) => ({
  _type,
  schemaVersion: 1,
  status: 'published',
});

describe('Landing migration manifest V1', () => {
  it('allows an incomplete pricing singleton so the planner can report a blocker', () => {
    expect(
      landingMigrationManifestV1Schema.safeParse({
        schemaVersion: 1,
        generatedAt: '2026-09-30T08:00:00.000Z',
        source: { provider: 'fixtures', revision: 'fixture-v1' },
        articles: [],
        campaigns: [],
        categories: [],
        pricing: null,
        marketingPages: [],
        siteSettings: document('siteSettings'),
        primaryNavigation: document('primaryNavigation'),
      }).success,
    ).toBe(true);
  });

  it('rejects provider-specific metadata at the envelope boundary', () => {
    const result = landingMigrationManifestV1Schema.safeParse({
      schemaVersion: 1,
      generatedAt: '2026-09-30T08:00:00.000Z',
      source: { provider: 'strapi', revision: 'document-id' },
      articles: [],
      campaigns: [],
      categories: [],
      pricing: null,
      marketingPages: [],
      siteSettings: document('siteSettings'),
      primaryNavigation: document('primaryNavigation'),
    });
    expect(result.success).toBe(false);
  });
});
