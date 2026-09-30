import { comparePublishedContentSnapshots } from '../src/content/content-parity.js';
import { createPublishedContentRepository } from '../src/content/published-content-repository.js';
import { exportLandingMigrationManifest } from '../src/migration/export-manifest.js';
import { createPublishedContentSnapshotFromManifest } from '../src/migration/manifest-snapshot.js';
import {
  PricingManifestMergeError,
  mergeApprovedPricing,
} from '../src/migration/merge-approved-pricing.js';
import { describe, expect, it } from 'vitest';

const approvedPricing = {
  _type: 'pricingPage',
  schemaVersion: 1,
  status: 'published',
  title: 'Approved title',
  introduction: 'Approved introduction.',
  currencyCode: 'USD',
  currencyMinorUnit: 2,
  locale: 'en-US',
  plans: [
    {
      _key: 'monthly',
      planId: 'monthly',
      name: 'Monthly',
      summary: 'Approved summary.',
      amountMinor: 1200,
      billing: { cadence: 'month', interval: 1 },
      entitlements: [{ _key: 'library', label: 'Movement library' }],
      cta: { label: 'Join', action: 'register' },
      recommended: true,
    },
  ],
  faq: [{ _key: 'cancel', question: 'Cancel?', answer: 'Approved answer.' }],
  cancellationTerms: 'Approved cancellation terms.',
  refundTerms: 'Approved refund terms.',
  seo: { title: 'Approved pricing', description: 'Approved description.' },
};

async function manifest() {
  const snapshot = await createPublishedContentRepository({
    contentSource: 'fixtures',
  }).load();
  return exportLandingMigrationManifest({
    snapshot,
    generatedAt: '2026-09-30T00:00:00.000Z',
    sourceRevision: 'fixture-revision',
  });
}

describe('approved Pricing manifest merge', () => {
  it('validates and merges Pricing without mutating the source manifest', async () => {
    const source = await manifest();
    const merged = mergeApprovedPricing(source, approvedPricing);

    expect(source.pricing).toBeNull();
    expect(merged.pricing).toEqual(approvedPricing);
  });

  it('turns the approved manifest into the semantic parity baseline', async () => {
    const source = await manifest();
    const merged = mergeApprovedPricing(source, approvedPricing);
    const expected = createPublishedContentSnapshotFromManifest(merged);
    const actual = createPublishedContentSnapshotFromManifest(
      structuredClone(merged),
    );

    expect(comparePublishedContentSnapshots(expected, actual)).toEqual({
      ok: true,
      issues: [],
    });
    expect(expected.pricing?.plans[0]?.amountMinor).toBe(1200);
  });

  it('rejects overwrite when the manifest already contains Pricing', async () => {
    const source = mergeApprovedPricing(await manifest(), approvedPricing);

    expect(() => mergeApprovedPricing(source, approvedPricing)).toThrowError(
      expect.objectContaining<Partial<PricingManifestMergeError>>({
        code: 'RESOURCE_CONFLICT',
      }),
    );
  });

  it('rejects commercially incomplete Pricing content', async () => {
    const source = await manifest();

    expect(() =>
      mergeApprovedPricing(source, {
        ...approvedPricing,
        refundTerms: '',
      }),
    ).toThrowError(
      expect.objectContaining<Partial<PricingManifestMergeError>>({
        code: 'INPUT_INVALID',
      }),
    );
  });
});
