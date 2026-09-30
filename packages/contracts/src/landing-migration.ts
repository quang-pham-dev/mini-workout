import { publishedDocumentSchema } from './landing-snapshot.js';
import { z } from 'zod';

export const landingMigrationManifestV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    generatedAt: z.iso.datetime({ offset: true }),
    source: z
      .object({
        provider: z.enum(['fixtures', 'sanity']),
        revision: z.string().min(1).max(200),
      })
      .strict(),
    articles: z.array(publishedDocumentSchema('article')),
    campaigns: z.array(publishedDocumentSchema('campaignPage')),
    categories: z.array(publishedDocumentSchema('category')),
    pricing: publishedDocumentSchema('pricingPage').nullable(),
    marketingPages: z.array(publishedDocumentSchema('marketingPage')),
    siteSettings: publishedDocumentSchema('siteSettings'),
    primaryNavigation: publishedDocumentSchema('primaryNavigation'),
  })
  .strict();

export type LandingMigrationManifestV1 = z.infer<
  typeof landingMigrationManifestV1Schema
>;

export function parseLandingMigrationManifestV1(
  value: unknown,
): LandingMigrationManifestV1 {
  return landingMigrationManifestV1Schema.parse(value);
}
