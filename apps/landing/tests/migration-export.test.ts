import { createPublishedContentRepository } from '../src/content/published-content-repository.js';
import { exportLandingMigrationManifest } from '../src/migration/export-manifest.js';
import { describe, expect, it } from 'vitest';

describe('Landing migration export', () => {
  it('exports stable route identity, relationships, sections and local media', async () => {
    const snapshot = await createPublishedContentRepository({
      contentSource: 'fixtures',
    }).load();
    const manifest = exportLandingMigrationManifest({
      snapshot,
      generatedAt: '2026-09-30T08:00:00.000Z',
    });

    expect(manifest.source.revision).toMatch(/^[a-f0-9]{64}$/);
    expect(manifest.articles[0]).toMatchObject({
      slug: 'a-gentler-way-to-explore-mobility',
      category: { slug: 'mobility' },
      author: { name: 'Mini Workout editorial' },
      image: { src: '/images/articles/mobility-range.webp' },
    });
    expect(manifest.articles[0]?.sections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          _key: 'range-is-not-a-score',
          _type: 'prose.v1',
        }),
        expect.objectContaining({
          _key: 'meet-the-movement',
          _type: 'pullQuote.v1',
        }),
      ]),
    );
    expect(manifest.pricing).toBeNull();
  });

  it('is deterministic apart from the injected generation timestamp', async () => {
    const snapshot = await createPublishedContentRepository({
      contentSource: 'fixtures',
    }).load();
    const first = exportLandingMigrationManifest({ snapshot });
    const second = exportLandingMigrationManifest({ snapshot });
    expect(first.source.revision).toBe(second.source.revision);
  });
});
