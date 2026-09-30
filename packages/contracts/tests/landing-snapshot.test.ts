import {
  landingSnapshotV1Schema,
  parseLandingSnapshotV1,
} from '../src/landing-snapshot.js';
import { describe, expect, it } from 'vitest';

function document(_type: string) {
  return { _type, schemaVersion: 1, status: 'published', title: 'Preserved' };
}

function snapshot() {
  return {
    schemaVersion: 1,
    generatedAt: '2026-09-30T08:00:00.000Z',
    revision: 'a'.repeat(24),
    articles: [document('article')],
    campaigns: [document('campaignPage')],
    categories: [document('category')],
    pricing: document('pricingPage'),
    marketingPages: [document('marketingPage')],
    siteSettings: document('siteSettings'),
    primaryNavigation: document('primaryNavigation'),
  };
}

describe('Landing snapshot V1 contract', () => {
  it('accepts the versioned envelope and preserves provider-neutral document fields', () => {
    const parsed = parseLandingSnapshotV1(snapshot());
    expect(parsed.articles[0]?.title).toBe('Preserved');
  });

  it.each([
    ['future envelope version', { schemaVersion: 2 }],
    ['future document version', { articles: [document('article-v2')] }],
    ['invalid revision', { revision: 'provider-id' }],
    ['missing singleton', { pricing: undefined }],
  ])('rejects %s', (_name, override) => {
    expect(
      landingSnapshotV1Schema.safeParse({ ...snapshot(), ...override }).success,
    ).toBe(false);
  });

  it('rejects unknown envelope fields while allowing document evolution inside V1', () => {
    expect(
      landingSnapshotV1Schema.safeParse({ ...snapshot(), accidental: true })
        .success,
    ).toBe(false);
  });
});
