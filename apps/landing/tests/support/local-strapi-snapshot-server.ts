import type { PublishedContentSnapshot } from '../../src/content/published-content-repository.js';
import { mapPublishedPricingDocuments } from '../../src/content/published-pricing.js';
import { exportLandingMigrationManifest } from '../../src/migration/export-manifest.js';
import {
  type LandingSnapshotV1,
  parseLandingSnapshotV1,
} from '@mini-workout/contracts';
import { createServer } from 'node:http';

const contractOnlyPricing = {
  _type: 'pricingPage' as const,
  schemaVersion: 1 as const,
  status: 'published' as const,
  title: 'Local contract rehearsal',
  introduction: 'Non-production content used only to verify the CMS boundary.',
  currencyCode: 'USD',
  currencyMinorUnit: 2,
  locale: 'en-US',
  plans: [
    {
      _key: 'contract-plan',
      planId: 'contract-plan',
      name: 'Contract plan',
      summary: 'Not a commercial offer.',
      amountMinor: 0,
      billing: { cadence: 'one_time' as const },
      entitlements: [
        { _key: 'contract-entitlement', label: 'Contract verification only' },
      ],
      cta: { label: 'Contract action', action: 'register' as const },
      recommended: false,
    },
  ],
  faq: [
    {
      _key: 'contract-faq',
      question: 'Is this a real offer?',
      answer: 'No. This content exists only inside the local test harness.',
    },
  ],
  cancellationTerms: 'Contract fixture only. No purchase can be made.',
  refundTerms: 'Contract fixture only. No payment is collected.',
  seo: {
    title: 'Local pricing contract rehearsal',
    description: 'Non-production pricing boundary verification.',
  },
};

export function createLocalStrapiSnapshot(baseline: PublishedContentSnapshot): {
  expected: PublishedContentSnapshot;
  transport: LandingSnapshotV1;
} {
  const manifest = exportLandingMigrationManifest({
    snapshot: baseline,
    generatedAt: '2026-09-30T00:00:00.000Z',
    sourceRevision: 'local-roundtrip',
  });
  const transport = parseLandingSnapshotV1({
    schemaVersion: 1,
    generatedAt: manifest.generatedAt,
    revision: 'a'.repeat(24),
    articles: manifest.articles,
    campaigns: manifest.campaigns,
    categories: manifest.categories,
    pricing: contractOnlyPricing,
    marketingPages: manifest.marketingPages,
    siteSettings: manifest.siteSettings,
    primaryNavigation: manifest.primaryNavigation,
  });

  return {
    expected: {
      ...baseline,
      pricing: mapPublishedPricingDocuments([contractOnlyPricing]),
    },
    transport,
  };
}

export async function startLocalStrapiSnapshotServer(options: {
  token: string;
  snapshot: LandingSnapshotV1;
}) {
  let authorized = 0;
  let unauthorized = 0;
  let preview = 0;
  const server = createServer((request, response) => {
    if (request.headers.authorization !== `Bearer ${options.token}`) {
      unauthorized += 1;
      response.statusCode = 401;
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify({ error: { name: 'UnauthorizedError' } }));
      return;
    }
    const publishedPath = request.url === '/api/landing/v1/snapshot';
    const previewPath = request.url === '/api/landing/v1/preview-snapshot';
    if (request.method !== 'GET' || (!publishedPath && !previewPath)) {
      response.statusCode = 404;
      response.end();
      return;
    }
    authorized += 1;
    if (previewPath) preview += 1;
    const payload = JSON.stringify(options.snapshot);
    response.statusCode = 200;
    response.setHeader('content-type', 'application/json');
    response.setHeader('content-length', Buffer.byteLength(payload));
    response.end(payload);
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Local Strapi snapshot server did not bind to a TCP port.');
  }

  return {
    apiUrl: `http://127.0.0.1:${address.port}`,
    requests: () => ({ authorized, unauthorized, preview }),
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}
